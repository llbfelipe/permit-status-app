/** @license
| Version 10.1.1
| Copyright 2012 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
|    http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/
dojo.require("dojo.window");
dojo.require("dojo.date.locale");
dojo.require("dojox.mobile.View");
dojo.require("esri.map");
dojo.require("esri.tasks.geometry");
dojo.require("esri.tasks.locator");
dojo.require("esri.tasks.query");
dojo.require("esri.tasks.StatisticDefinition");
dojo.require("esri.layers.FeatureLayer");
dojo.require("js.config");
dojo.require("js.date");
dojo.require("js.InfoWindow");
dojo.require("esri.arcgis.utils");

var map; //variable to store map object
var isiOS = false;
var isBrowser = false; //This variable is set to true when the app is running on desktop browsers
var isMobileDevice = false; //This variable is set to true when the app is running on mobile device 
var isTablet = false; //This variable is set to true when the app is running on tablets

var zoomLevel; //variable to store the zoom level
var baseMapLayers; //Variable for storing base map layers
var showNullValueAs; //variable to store the default value for replacing null values
var mapSharingOptions; //variable for storing the tiny service URL 
var geometryService; //variable to store the Geometry service 
var tempGraphicsLayerId = "tempGraphicsLayerID"; //variable to store temporary graphics layer id
var infoPopupHeight; //variable used for storing the info window height
var infoPopupWidth; //variable used for storing the info window width
var mapPoint; //variable to store map point 
var formatDateAs; //variable to store date format
var selectedMapPoint; // variable to store selected map point
var locatorMarkupSymbol;
var windowURL = window.location.toString();
var splashScreenVisibility;
var locatorSettings;
var lastSearchString; //variable to store the last search string
var stagedSearch; //variable to store the time limit for search
var lastSearchTime; //variable to store the time of last search
var permitResultData;
var countyLayerData;
var isCountySearched;
var featureID;
var infoWindowLayerID;
var searchFeatureID;
var searchInfoWindowLayerID;
var sharedLayerID;
var sharedFeatureID;
var shareQuery;
var renderArray = [];

//This initialization function is called when the DOM elements are ready
function Init() {
    esri.config.defaults.io.proxyUrl = "proxy.ashx"; //relative path
    esriConfig.defaults.io.alwaysUseProxy = false;
    esriConfig.defaults.io.timeout = 180000; // milliseconds

    var userAgent = window.navigator.userAgent;
    if (userAgent.indexOf("iPhone") >= 0 || userAgent.indexOf("iPad") >= 0) {
        isiOS = true;
    }

    if ((userAgent.indexOf("Android") >= 0 && userAgent.indexOf("Mobile") >= 0) || userAgent.indexOf("iPhone") >= 0) {
        isMobileDevice = true;
        dojo.byId('dynamicStyleSheet').href = "styles/mobile.css";
        dojo.byId('divSplashContent').style.fontSize = "15px";
    } else if (userAgent.indexOf("iPad") >= 0 || userAgent.indexOf("Android") >= 0) {
        isTablet = true;
        dojo.byId('dynamicStyleSheet').href = "styles/tablet.css";
        dojo.byId('divSplashContent').style.fontSize = "14px";
    } else {
        isBrowser = true;
        dojo.byId('dynamicStyleSheet').href = "styles/browser.css";
        dojo.byId('divSplashContent').style.fontSize = "11px";
    }
    var responseObject = new js.config();

    dojo.connect(dojo.byId("imgLocate"), "onclick", function (evt) {
        Locate();
    });

    if (responseObject.UseWebmap) {
        var mapDeferred = esri.arcgis.utils.createMap(responseObject.WebMapId, "map1", {
            mapOptions: {
                slider: true
            }
        });

        mapDeferred.then(function (response) {
            renderArray = [];
            for (var k in responseObject.PermitResultDataForWebmap) {
                renderArray[k] = [];
                renderArray[k] = response.map._layers[k].renderer;
            }

            response.map.destroy();
            AddLayersToMap();

        }, function (error) {
            console.log("Map creation failed: ", dojo.toJson(error));
        });
    }

    dojo.connect(dojo.byId("txtAddress"), 'onkeyup', function (evt) {
        if (!responseObject.AutoCompleteForPermit && dojo.hasClass(dojo.byId('tdSearchPermit'), "tdSearchByPermit")) {
            return;
        }
        if (evt) {
            if (evt.keyCode == dojo.keys.ENTER) {
                if (dojo.byId("txtAddress").value != '') {
                    dojo.byId("imgSearchLoader").style.display = "block";
                    Locate();
                    return;
                }
            }
            //validations for auto complete search
            if ((!((evt.keyCode >= 46 && evt.keyCode < 58) || (evt.keyCode > 64 && evt.keyCode < 91) || (evt.keyCode > 95 && evt.keyCode < 106) || evt.keyCode == 8 || evt.keyCode == 110 || evt.keyCode == 188)) || (evt.keyCode == 86 && evt.ctrlKey) || (evt.keyCode == 88 && evt.ctrlKey)) {
                evt = (evt) ? evt : event;
                evt.cancelBubble = true;
                if (evt.stopPropagation) evt.stopPropagation();
                return;
            }
            if (dojo.coords("divAddressContent").h > 0) {
                if (dojo.byId("txtAddress").value.trim() != '') {
                    if (lastSearchString != dojo.byId("txtAddress").value.trim()) {
                        lastSearchString = dojo.byId("txtAddress").value.trim();
                        dojo.empty(dojo.byId('tblAddressResults'));

                        // Clear any staged search
                        clearTimeout(stagedSearch);
                        if (dojo.byId("txtAddress").value.trim().length > 0) {
                            // Stage a new search, which will launch if no new searches show up 
                            // before the timeout
                            stagedSearch = setTimeout(function () {
                                dojo.byId("imgSearchLoader").style.display = "block";
                                Locate();
                                lastSearchString = dojo.byId("txtAddress").value.trim();
                            }, 500);
                        }
                    }
                } else {
                    lastSearchString = dojo.byId("txtAddress").value.trim();
                    dojo.byId("imgSearchLoader").style.display = "none";
                    dojo.empty(dojo.byId('tblAddressResults'));
                    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
                }
            }
        }
    });

    dojo.connect(dojo.byId("txtAddress"), 'onpaste', function (evt) {
        setTimeout(function () {
            Locate();
        }, 100);
    });

    dojo.connect(dojo.byId("txtAddress"), 'oncut', function (evt) {
        setTimeout(function () {
            Locate();
        }, 100);
    });

    locatorSettings = responseObject.LocatorSettings;
    shareQuery = responseObject.ShareQuery;
    dojo.byId("tdSearchAddress").innerHTML = locatorSettings.Locators[0].DisplayText;
    dojo.byId('divAddressContainer').style.display = "none";
    dojo.byId("tdSearchLocation").innerHTML = locatorSettings.Locators[1].DisplayText;
    dojo.byId("tdSearchPermit").innerHTML = locatorSettings.Locators[2].DisplayText;
    dojo.byId("txtAddress").value = locatorSettings.Locators[0].LocatorDefaultAddress;
    dojo.byId("txtAddress").setAttribute("defaultAddress", locatorSettings.Locators[0].LocatorDefaultAddress);
    dojo.byId("txtAddress").setAttribute("defaultLocation", responseObject.LocatorSettings.Locators[1].LocatorDefaultLocation);
    dojo.byId("txtAddress").setAttribute("defaultPermit", responseObject.LocatorSettings.Locators[2].LocatorDefaultPermit);
    dojo.byId("txtAddress").style.color = "gray";

    dojo.connect(dojo.byId('txtAddress'), "ondblclick", ClearDefaultText);
    dojo.connect(dojo.byId('txtAddress'), "onblur", ReplaceDefaultText);
    dojo.connect(dojo.byId('txtAddress'), "onfocus", function () {
        this.style.color = "#FFF";
    });

    if (!Modernizr.geolocation) {
        dojo.byId("tdGeolocation").style.display = "none";
    }

    if (isMobileDevice) {
        dojo.byId('divInfoContainer').style.display = "none";
        dojo.byId('divAddressContainer').style.display = "none";
        dojo.removeClass(dojo.byId('divInfoContainer'), "opacityHideAnimation");
        dojo.byId('divSplashScreenContent').style.width = "95%";
        dojo.byId('divSplashScreenContent').style.height = "95%";
        dojo.byId("divLogo").style.display = "none";
        dojo.byId("lblAppName").style.display = "none";
        dojo.byId("lblAppName").style.width = "80%";
        dojo.byId("tdSearchAddress").className = "tdSearchByAddress";
    } else {
        var imgBasemap = document.createElement('img');
        imgBasemap.src = "images/imgbasemap.png";
        imgBasemap.className = "imgOptions";
        imgBasemap.title = "Switch Basemap";
        imgBasemap.id = "imgBaseMap";
        imgBasemap.style.cursor = "pointer";
        imgBasemap.onclick = function () {
            ShowBaseMaps();
        }
        dojo.byId("tdBaseMap").appendChild(imgBasemap);
        dojo.byId("tdBaseMap").className = "tdHeader";
        dojo.byId("divSplashScreenContent").style.width = "350px";
        dojo.byId("divSplashScreenContent").style.height = "290px";
        dojo.byId("divAddressContainer").style.display = "block";
        dojo.byId("divLogo").style.display = "block";
    }
    dojo.byId('imgApp').src = responseObject.ApplicationIcon;
    dojo.byId('divSplashContent').innerHTML = responseObject.SplashScreen.Message;
    dojo.byId('lblAppName').innerHTML = responseObject.ApplicationName;
    formatDateAs = responseObject.FormatDateAs;
    mapSharingOptions = responseObject.MapSharingOptions;
    baseMapLayers = responseObject.BaseMapLayers;
    showNullValueAs = responseObject.ShowNullValueAs;
    infoPopupHeight = responseObject.InfoPopupHeight;
    infoPopupWidth = responseObject.InfoPopupWidth;
    geometryService = new esri.tasks.GeometryService(responseObject.GeometryService);
    permitResultData = responseObject.PermitResultData;
    countyLayerData = responseObject.CountyLayerData;
    splashScreenVisibility = responseObject.SplashScreen.isVisibile;

    dojo.xhrGet({
        url: "ErrorMessages.xml",
        handleAs: "xml",
        preventCache: true,
        load: function (xmlResponse) {
            messages = xmlResponse;
        }
    });

    dojo.connect(dojo.byId('imgHelp'), "onclick", function () {
        window.open(responseObject.HelpURL);
    });

    if (responseObject.UseWebmap) {
        var webMapData = getWebMapInfo("permitStatusKey", responseObject.WebMapId);
        webMapData.addCallback(function (webMapDetails) {
            permitResultData = {};
            for (var i = 0; i < webMapDetails.operationalLayers.length; i++) {
                var operationalLayerId = dojo.trim(webMapDetails.operationalLayers[i].id)
                for (var index in responseObject.PermitResultDataForWebmap) {

                    if (operationalLayerId == index) {
                        permitResultData[operationalLayerId] = {}

                        permitResultData[operationalLayerId]["ListDisplayText"] = responseObject.PermitResultDataForWebmap[index].ListDisplayText;
                        permitResultData[operationalLayerId]["ListFieldName"] = responseObject.PermitResultDataForWebmap[index].ListFieldName;
                        permitResultData[operationalLayerId]["SearchField"] = responseObject.PermitResultDataForWebmap[index].SearchField;
                        permitResultData[operationalLayerId]["PermitType"] = responseObject.PermitResultDataForWebmap[index].PermitType;
                        permitResultData[operationalLayerId]["InfoWindowHeader"] = responseObject.PermitResultDataForWebmap[index].InfoWindowHeader;
                        permitResultData[operationalLayerId]["InfoWindowContent"] = responseObject.PermitResultDataForWebmap[index].InfoWindowContent;
                        permitResultData[operationalLayerId]["SearchQuery"] = responseObject.PermitResultDataForWebmap[index].SearchQuery;
                        permitResultData[operationalLayerId]["isDynamicMapService"] = responseObject.PermitResultDataForWebmap[index].isDynamicMapService;
                        permitResultData[operationalLayerId]["ServiceURL"] = webMapDetails.operationalLayers[i].url;

                        if (webMapDetails.operationalLayers[i].popupInfo) {
                            permitResultData[operationalLayerId]["InfoWindowData"] = [];
                            for (var x in webMapDetails.operationalLayers[i].popupInfo.fieldInfos) {
                                if (webMapDetails.operationalLayers[i].popupInfo.fieldInfos[x].visible) {
                                    permitResultData[operationalLayerId]["InfoWindowData"].push({
                                        "DisplayText": webMapDetails.operationalLayers[i].popupInfo.fieldInfos[x].label + ":",
                                        "FieldName": "${" + webMapDetails.operationalLayers[i].popupInfo.fieldInfos[x].fieldName + "}"
                                    });
                                }
                            }
                        }
                        break;
                    }
                }
                if (!webMapDetails.operationalLayers[i].popupInfo) {
                    countyLayerData.Key = operationalLayerId;
                    countyLayerData.ServiceURL = webMapDetails.operationalLayers[i].url;
                    countyLayerData.SearchQuery = responseObject.CountyLayerData.SearchQuery;
                    countyLayerData.ListFieldName = responseObject.CountyLayerData.ListFieldName;
                    countyLayerData.UseGeocoderService = responseObject.CountyLayerData.UseGeocoderService;
                    countyLayerData.isDynamicMapService = responseObject.CountyLayerData.isDynamicMapService;
                }
            }
            InitializeMap(responseObject.DefaultExtent, responseObject.UseWebmap);
        });
    } else {
        InitializeMap(responseObject.DefaultExtent, responseObject.UseWebmap);
    }
}

//function to initialize map after reading the config settings
function InitializeMap(defaultExtent, useWebmap) {
    var infoWindow = new js.InfoWindow({
        domNode: dojo.create("div", null, dojo.byId("map"))
    });

    map = new esri.Map("map", {
        slider: true,
        infoWindow: infoWindow
    });
    dojo.connect(map, "onLoad", function () {
        MapInitFunction(useWebmap);
        var url = esri.urlToObject(window.location.toString());
        if (url.query && url.query != null) {
            if (url.query.extent.split("$point=").length > 1) {
                var tempSelectedPoint = url.query.extent.split("$point=")[1];
                currentExtent = tempSelectedPoint.split("$currentExtent=")[1];
                if (currentExtent) {
                    var currentExtSplit = currentExtent.split(',');
                    var currentExt = new esri.geometry.Extent(parseFloat(currentExtSplit[0]), parseFloat(currentExtSplit[1]), parseFloat(currentExtSplit[2]), parseFloat(currentExtSplit[3]), map.spatialReference);
                    map.setExtent(currentExt);
                }
                var selectedPoint = tempSelectedPoint.split("$currentExtent=")[0];
                var selectedPermit = tempSelectedPoint.split("$currentExtent=")[1];
                if (selectedPermit.split("$featureID=").length > 1) {
                    setTimeout(function () {
                        var splitPoint = selectedPoint.split(',');
                        var sPoint = new esri.geometry.Point(parseFloat(splitPoint[0]), parseFloat(splitPoint[1]), map.spatialReference);

                        var tempFeatureID = tempSelectedPoint.split("$featureID=")[1];
                        if (tempFeatureID.split("$infoWindowLayerID=").length > 1) {
                            sharedFeatureID = tempFeatureID.split("$infoWindowLayerID=")[0];
                            sharedLayerID = tempFeatureID.split("$infoWindowLayerID=")[1];
                        }
                        FindPermits(sPoint);
                    }, 1000);
                }
                else {
                    setTimeout(function () {
                        var splitPoint = selectedPoint.split(',');
                        var sPoint = new esri.geometry.Point(parseFloat(splitPoint[0]), parseFloat(splitPoint[1]), map.spatialReference);
                        FindPermits(sPoint);
                    }, 1000);
                }
            } else if (url.query.extent.split("$searchFeatureID=").length > 0) {
                var tempFeatureID = url.query.extent.split("$searchFeatureID=")[1];
                if (tempFeatureID) {
                    if (tempFeatureID.split("$searchInfoWindowLayerID=").length > 1) {
                        var searchFlag = true;
                        searchFeatureID = sharedFeatureID = tempFeatureID.split("$searchInfoWindowLayerID=")[0];
                        searchInfoWindowLayerID = sharedLayerID = tempFeatureID.split("$searchInfoWindowLayerID=")[1];
                    }
                }
            }
            if (sharedFeatureID && sharedLayerID && searchFlag) {
                ShareInfoWindow();
            }
        }

        var mapExtent = defaultExtent.split(',');
        extent = GetQuerystring('extent');
        if (extent == "") {
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
            currentExtent = true;
        }
        if (!currentExtent) {
            mapExtent = extent.split(',');
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
        }
    });

    dojo.connect(map, "onExtentChange", function () {
        SetMapTipPosition();
        if (dojo.coords("divAppContainer").h > 0) {
            ShareLink();
        }
    });

    CreateBaseMapComponent();

    if (dojo.query('.logo-med', dojo.byId('map')).length > 0) {
        dojo.query('.logo-med', dojo.byId('map'))[0].id = "esriLogo";
    } else if (dojo.query('.logo-sm', dojo.byId('map')).length > 0) {
        dojo.query('.logo-sm', dojo.byId('map'))[0].id = "esriLogo";
    }

    dojo.addClass("esriLogo", "esriLogo");
    if (splashScreenVisibility) {
        dojo.byId('divSplashScreenContainer').style.display = "block";
        dojo.addClass(dojo.byId('divSplashScreenContent'), "divSplashScreenDialogContent");
        SetSplashScreenHeight();
    }
    if (isMobileDevice) {
        SetAddressResultsHeight();
        SetViewDetailsHeight();
    }
    dojo.byId("esriLogo").style.bottom = "10px";
}

//Create graphics and feature layer
function MapInitFunction(useWebmap) {
    var graphicsLayer = new esri.layers.GraphicsLayer();
    graphicsLayer.id = tempGraphicsLayerId;
    map.addLayer(graphicsLayer);

    if (!useWebmap) {
        AddLayersToMap();
    }

    dojo.connect(map, "onClick", function (evt) {
        featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = sharedFeatureID = sharedLayerID = null;
        addressSearchFlag = false;
        map.infoWindow.hide();
        evt.mapPoint.spatialReference = map.spatialReference;
        FindPermits(evt.mapPoint);
    });

    window.onresize = function () {
        if (!isMobileDevice) {
            ResizeHandler();
        } else {
            OrientationChanged();
        }
    }
}

function AddLayersToMap() {
    for (var index in permitResultData) {
        permitResultData[index].isDynamicMapService ? map.addLayer(CreateDynamicMapServiceLayer(index, permitResultData[index].ServiceURL, renderArray[index])) : map.addLayer(CreateFeatureServiceLayer(index, permitResultData[index].ServiceURL, renderArray[index]));
    }
    countyLayerData.isDynamicMapService ? map.addLayer(CreateDynamicMapServiceLayer(countyLayerData.Key, countyLayerData.ServiceURL, null)) : map.addLayer(CreateFeatureServiceLayer(countyLayerData.Key, countyLayerData.ServiceURL, null));
}

dojo.addOnLoad(Init);