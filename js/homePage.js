/*
 | Version 10.2
 | Copyright 2013 Esri
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
dojo.require("dojo.dom");
dojo.require("dojo.dom-class");
dojo.require("dojo.dom-construct");
dojo.require("dojo.dom-geometry");
dojo.require("dojo._base.array");
dojo.require("dojox.mobile.View");
dojo.require("esri.map");
dojo.require("esri.tasks.geometry");
dojo.require("esri.tasks.locator");
dojo.require("esri.tasks.query");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.arcgis.utils");
dojo.require("js.config");
dojo.require("js.date");
dojo.require("js.infoWindow");

var map; //variable to store map object
var isiOS = false;
var isBrowser = false; //This variable is set to true when the app is running on desktop browsers
var isMobileDevice = false; //This variable is set to true when the app is running on mobile device 
var isTablet = false; //This variable is set to true when the app is running on tablets
var baseMapLayers; //variable for storing base map layers
var showNullValueAs; //variable to store the default value for replacing null values
var mapSharingOptions; //variable for storing the tiny service URL 
var geometryService; //variable to store the Geometry service 
var tempGraphicsLayerId = "tempGraphicsLayerID"; //variable to store temporary graphics layer id
var infoPopupHeight; //variable used for storing the info window height
var infoPopupWidth; //variable used for storing the info window width
var mapPoint; //variable to store map point 
var formatDateAs; //variable to store date format
var selectedMapPoint; // variable to store selected map point
var windowURL = window.location.toString();
var splashScreenVisibility; //control flag to set the visibility of the splashScreen
var locatorSettings; //variable to store locator settings
var lastSearchString; //variable to store the last search string
var stagedSearch; //variable to store the time limit for search
var lastSearchTime; //variable to store the time of last search
var permitResultData; //variable to store the Permit Result Data
var countyLayerData; //variable to store the County layer Data
var isCountySearched;
var featureID; //variable to store the feature id when user selects a permit from the permit list InfoWindow
var infoWindowLayerID; //variable to store the layer id of the feature when user selects a permit from the permit list InfoWindow
var searchFeatureID; //variable to store the feature id when user searches for a permit
var searchInfoWindowLayerID; //variable to store the layer id of the feature when user searches for a permit
var baseMapId; //variable to store the BaseMap id of WebMap
var isWebMap = false; //control flag to check if WebMap is enabled/disabled
var webmapExtent; //variable to store the map extent fetched from WebMap
var responseObject;
var addressSearchFlag = false; //This variable is set to true when address search is performed and is false when location search is performed
var extent; //variable to store the map extent
var shareFlag = false;

//This initialization function is called when the DOM elements are ready

function Init() {
    SetAPIDefaults();
    DetectDevice();
    responseObject = new js.config();

    var shortcutIcon = document.createElement("link");
    shortcutIcon.rel = "shortcut icon";
    shortcutIcon.type = "image/x-icon";
    shortcutIcon.href = responseObject.ApplicationFavicon;
    document.getElementsByTagName('head')[0].appendChild(shortcutIcon);
    if (isMobileDevice || isTablet) {
        var appleTouchIcon = document.createElement("link");
        appleTouchIcon.rel = "apple-touch-icon-precomposed";
        appleTouchIcon.type = "image/x-icon";
        appleTouchIcon.href = responseObject.ApplicationIcon;
        document.getElementsByTagName('head')[0].appendChild(appleTouchIcon);

        var appleTouchIcon = document.createElement("link");
        appleTouchIcon.rel = "apple-touch-icon";
        appleTouchIcon.type = "image/x-icon";
        appleTouchIcon.href = responseObject.ApplicationIcon;
        document.getElementsByTagName('head')[0].appendChild(appleTouchIcon);
    }

    dojo.connect(dojo.byId("imgLocate"), "onclick", function () {
        ValidateLocateType();
    });

    dojo.connect(dojo.dom.byId("txtAddress"), 'onkeyup', function (evt) {
        InitializeAutocompleteSearch(evt);
    });

    dojo.connect(dojo.dom.byId("txtAddress"), 'onpaste', function () {
        setTimeout(function () {
            ValidateLocateType();
        }, 100);
    });

    dojo.connect(dojo.dom.byId("txtAddress"), 'oncut', function () {
        setTimeout(function () {
            ValidateLocateType();
        }, 100);
    });

    dojo.dom.byId("tdSearchAddress").innerHTML = responseObject.LocatorSettings.Locators[0].DisplayText;
    dojo.dom.byId('divAddressContainer').style.display = "none";
    dojo.dom.byId("tdSearchLocation").innerHTML = responseObject.LocatorSettings.Locators[1].DisplayText;
    dojo.dom.byId("tdSearchPermit").innerHTML = responseObject.LocatorSettings.Locators[2].DisplayText;
    dojo.dom.byId("txtAddress").value = responseObject.LocatorSettings.Locators[0].LocatorDefaultAddress;
    dojo.dom.byId("txtAddress").setAttribute("defaultAddress", responseObject.LocatorSettings.Locators[0].LocatorDefaultAddress);
    dojo.dom.byId("txtAddress").setAttribute("defaultLocation", responseObject.LocatorSettings.Locators[1].LocatorDefaultLocation);
    dojo.dom.byId("txtAddress").setAttribute("defaultPermit", responseObject.LocatorSettings.Locators[2].LocatorDefaultPermit);
    dojo.dom.byId("txtAddress").style.color = "gray";

    dojo.connect(dojo.dom.byId('txtAddress'), "ondblclick", ClearDefaultText);
    dojo.connect(dojo.dom.byId('txtAddress'), "onblur", ReplaceDefaultText);
    dojo.connect(dojo.dom.byId('txtAddress'), "onfocus", function () {
        this.style.color = "#FFF";
    });

    if (!Modernizr.geolocation) {
        dojo.dom.byId("tdGeolocation").style.display = "none";
    }

    if (isMobileDevice) {
        dojo.dom.byId('divInfoContainer').style.display = "none";
        dojo.dom.byId('divAddressContainer').style.display = "none";
        dojo['dom-class'].remove(dojo.dom.byId('divInfoContainer'), "opacityHideAnimation");
        dojo.dom.byId('divSplashScreenContent').style.width = "95%";
        dojo.dom.byId('divSplashScreenContent').style.height = "95%";
        dojo.dom.byId("divLogo").style.display = "none";
        dojo.dom.byId("lblAppName").style.display = "none";
        dojo.dom.byId("lblAppName").style.width = "80%";
        dojo.dom.byId("tdSearchAddress").className = "tdSearchByAddress";
    } else {
        var imgBasemap = document.createElement('img');
        imgBasemap.src = "images/imgbasemap.png";
        imgBasemap.className = "imgOptions";
        imgBasemap.title = "Switch Basemap";
        imgBasemap.id = "imgBaseMap";
        imgBasemap.style.cursor = "pointer";
        imgBasemap.onclick = function () {
            ShowBaseMaps();
        };
        dojo.dom.byId("tdBaseMap").appendChild(imgBasemap);
        dojo.dom.byId("tdBaseMap").className = "tdHeader";
        dojo.dom.byId("divSplashScreenContent").style.width = "350px";
        dojo.dom.byId("divSplashScreenContent").style.height = "290px";
        dojo.dom.byId("divAddressContainer").style.display = "block";
        dojo.dom.byId("divLogo").style.display = "block";
    }
    dojo.dom.byId('imgApp').src = responseObject.ApplicationIcon;
    dojo.dom.byId('divSplashContent').innerHTML = responseObject.SplashScreen.Message;
    dojo.dom.byId('lblAppName').innerHTML = responseObject.ApplicationName;
    permitResultData = responseObject.PermitResultData;
    countyLayerData = responseObject.CountyLayerData;

    LoadErrorMessages();

    dojo.connect(dojo.dom.byId('imgHelp'), "onclick", function () {
        window.open(responseObject.HelpURL);
    });

    if (responseObject.WebMapId) {
        InitializeWebMap();
    } else {
        InitializeMap();
    }
}

function InitializeAutocompleteSearch(evt) {
    if (!responseObject.AutoCompleteForPermit && dojo.hasClass(dojo.dom.byId('tdSearchPermit'), "tdSearchByPermit")) {
        return;
    }
    if (evt) {
        if (evt.keyCode == dojo.keys.ENTER) {
            if (dojo.dom.byId("txtAddress").value != '') {
                dojo.dom.byId("imgSearchLoader").style.display = "block";
                ValidateLocateType();
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
        if (dojo['dom-geometry'].getMarginBox("divAddressContent").h > 0) {
            if (Trim(dojo.dom.byId("txtAddress").value) != '') {
                if (lastSearchString != Trim(dojo.dom.byId("txtAddress").value)) {
                    lastSearchString = Trim(dojo.dom.byId("txtAddress").value);
                    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));

                    // Clear any staged search
                    clearTimeout(stagedSearch);
                    if (Trim(dojo.dom.byId("txtAddress").value).length > 0) {
                        // Stage a new search, which will launch if no new searches show up 
                        // before the timeout
                        stagedSearch = setTimeout(function () {
                            dojo.dom.byId("imgSearchLoader").style.display = "block";
                            ValidateLocateType();
                            lastSearchString = Trim(dojo.dom.byId("txtAddress").value);
                        }, 500);
                    }
                }
            } else {
                lastSearchString = Trim(dojo.dom.byId("txtAddress").value);
                dojo.dom.byId("imgSearchLoader").style.display = "none";
                dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
                RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            }
        }
    }
}

function InitializeWebMap() {
    dojo.dom.byId("tdBaseMap").style.display = "none";
    isWebMap = true;

    var mapDeferred = esri.arcgis.utils.createMap(responseObject.WebMapId, "map", {
        mapOptions: {
            slider: true
        },
        ignorePopups: true
    });

    mapDeferred.then(function (response) {
        permitResultData = [];
        map = response.map;
        webmapExtent = response.map.extent;
        baseMapId = response.itemInfo.itemData.baseMap.baseMapLayers[0].id;
        var webMapDetails = response.itemInfo.itemData;
        for (var i = 0; i < webMapDetails.operationalLayers.length; i++) {
            var operationalLayerId = Trim(webMapDetails.operationalLayers[i].title);

            for (var index = 0; index < responseObject.PermitResultData.length; index++) {
                if (operationalLayerId == Trim(responseObject.PermitResultData[index].Title)) {
                    permitResultData[index] = {}
                    permitResultData[index]["Title"] = responseObject.PermitResultData[index].Title;
                    permitResultData[index]["ServiceURL"] = webMapDetails.operationalLayers[i].url;
                    permitResultData[index]["LoadAsServiceType"] = responseObject.PermitResultData[index].LoadAsServiceType;
                    permitResultData[index]["ListDisplayText"] = responseObject.PermitResultData[index].ListDisplayText;
                    permitResultData[index]["ListFieldName"] = responseObject.PermitResultData[index].ListFieldName;
                    permitResultData[index]["SearchDisplayField"] = responseObject.PermitResultData[index].SearchDisplayField;
                    permitResultData[index]["InfoWindowHeader"] = responseObject.PermitResultData[index].InfoWindowHeader;
                    permitResultData[index]["InfoWindowContent"] = responseObject.PermitResultData[index].InfoWindowContent;
                    permitResultData[index]["SearchQuery"] = responseObject.PermitResultData[index].SearchQuery;
                    if (webMapDetails.operationalLayers[i].popupInfo) {
                        permitResultData[index]["InfoWindowData"] = [];
                        for (var field in webMapDetails.operationalLayers[i].popupInfo.fieldInfos) {
                            if (webMapDetails.operationalLayers[i].popupInfo.fieldInfos[field].visible) {
                                permitResultData[index]["InfoWindowData"].push({
                                    "DisplayText": webMapDetails.operationalLayers[i].popupInfo.fieldInfos[field].label + ":",
                                    "FieldName": "${" + webMapDetails.operationalLayers[i].popupInfo.fieldInfos[field].fieldName + "}"
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
                countyLayerData.CountyDisplayField = responseObject.CountyLayerData.CountyDisplayField;
                countyLayerData.UseGeocoderService = responseObject.CountyLayerData.UseGeocoderService;
                countyLayerData.isDynamicMapService = responseObject.CountyLayerData.isDynamicMapService;
            }
        }
        GetDataFromLayers(0);
        dojo.destroy(map.infoWindow);
        var infoWindow = new js.InfoWindow({
            domNode: dojo.create("div", null, dojo.dom.byId("map"))
        });
        map.infoWindow = infoWindow;
        AddLayersToMap();
        dojo.connect(map, "onExtentChange", function () {
            SetMapTipPosition();
            if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
                ShareLink();
            }
        });
        MapOnLoad(map.extent);
    });
}

function SetAPIDefaults() {
    esri.config.defaults.io.proxyUrl = "proxy.ashx"; //relative path
    esriConfig.defaults.io.alwaysUseProxy = false;
    esriConfig.defaults.io.timeout = 180000; // milliseconds
}

function DetectDevice() {
    var userAgent;
    userAgent = window.navigator.userAgent;
    if (userAgent.indexOf("iPhone") >= 0 || userAgent.indexOf("iPad") >= 0) {
        isiOS = true;
    }
    if ((userAgent.indexOf("Android") >= 0 && userAgent.indexOf("Mobile") >= 0) || userAgent.indexOf("iPhone") >= 0) {
        isMobileDevice = true;
        dojo.dom.byId('dynamicStyleSheet').href = "styles/mobile.css";
        dojo.dom.byId('divSplashContent').style.fontSize = "15px";
    } else if (userAgent.indexOf("iPad") >= 0 || userAgent.indexOf("Android") >= 0) {
        isTablet = true;
        dojo.dom.byId('dynamicStyleSheet').href = "styles/tablet.css";
        dojo.dom.byId('divSplashContent').style.fontSize = "14px";
    } else {
        isBrowser = true;
        dojo.dom.byId('dynamicStyleSheet').href = "styles/browser.css";
        dojo.dom.byId('divSplashContent').style.fontSize = "11px";
    }
}

// Load error messages from the XML file

function LoadErrorMessages() {
    dojo.xhrGet({
        url: "ErrorMessages.xml",
        handleAs: "xml",
        preventCache: true,
        load: function (xmlResponse) {
            messages = xmlResponse;
        },
        error: function (err) {
            alert(err.message);
        }
    });
}

//Initialize map after reading the config settings

function InitializeMap() {
    var infoWindow = new js.InfoWindow({
        domNode: dojo.create("div", null, dojo.dom.byId("map"))
    });

    map = new esri.Map("map", {
        slider: true,
        infoWindow: infoWindow
    });

    dojo.connect(map, "onLoad", function () {
        AddLayersToMap();
        MapOnLoad();
    });

    dojo.connect(map, "onExtentChange", function () {
        SetMapTipPosition();
        if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
            ShareLink();
        }
    });
    CreateBaseMapComponent();
}

//Operations to be performed after the map has been loaded

function MapOnLoad() {
    map.disableKeyboardNavigation();
    var url = esri.urlToObject(window.location.toString());
    if (url.query) {
        if (url.query.extent.split("$point=").length > 1) {
            var tempSelectedPoint = url.query.extent.split("$point=")[1];
            currentExtent = tempSelectedPoint.split("$currentExtent=")[1];
            if (currentExtent) {
                var currentExtSplit = currentExtent.split(',');
                var currentExt = new esri.geometry.Extent(parseFloat(currentExtSplit[0]), parseFloat(currentExtSplit[1]), parseFloat(currentExtSplit[2]), parseFloat(currentExtSplit[3]), map.spatialReference);
                var extentDeferred = map.setExtent(currentExt);
            }
            var selectedPoint = tempSelectedPoint.split("$currentExtent=")[0];
            var selectedPermit = tempSelectedPoint.split("$currentExtent=")[1];
            extentDeferred.then(function () {
                if (selectedPermit.split("$featureID=").length > 1) {
                    var splitPoint = selectedPoint.split(',');
                    var sPoint = new esri.geometry.Point(parseFloat(splitPoint[0]), parseFloat(splitPoint[1]), map.spatialReference);
                    var tempFeatureID = tempSelectedPoint.split("$featureID=")[1];
                    if (tempFeatureID.split("$infoWindowLayerID=").length > 1) {
                        shareFlag = true;
                        featureID = tempFeatureID.split("$infoWindowLayerID=")[0];
                        infoWindowLayerID = tempFeatureID.split("$infoWindowLayerID=")[1];
                    }
                    FindPermits(sPoint);
                } else {
                    var splitPoint = selectedPoint.split(',');
                    var sPoint = new esri.geometry.Point(parseFloat(splitPoint[0]), parseFloat(splitPoint[1]), map.spatialReference);
                    FindPermits(sPoint);
                }
            });
        } else if (url.query.extent.split("$searchFeatureID=").length > 0) {
            var tempFeatureID = url.query.extent.split("$searchFeatureID=")[1];
            if (tempFeatureID) {
                if (tempFeatureID.split("$searchInfoWindowLayerID=").length > 1) {
                    addressSearchFlag = true;
                    searchFeatureID = tempFeatureID.split("$searchInfoWindowLayerID=")[0];
                    searchInfoWindowLayerID = tempFeatureID.split("$searchInfoWindowLayerID=")[1];
                }
            }
        }
        if (searchFeatureID && searchInfoWindowLayerID && addressSearchFlag) {
            ShareInfoWindow();
        }
    }

    extent = GetQueryString('extent');
    if (extent == "") {
        currentExtent = true;
    }
    if (!isWebMap) {
        var mapExtent = responseObject.DefaultExtent.split(',');
        if (extent == "") {
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
        }
    }
    if (!currentExtent) {
        mapExtent = extent.split(',');
        mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
        map.setExtent(mapExtent);
        if (!addressSearchFlag) {
            extent = "";
        }
    }
    SetInitialExtent();
    if (dojo.query('.logo-med', dojo.dom.byId('map')).length > 0) {
        dojo.query('.logo-med', dojo.dom.byId('map'))[0].id = "esriLogo";
    } else if (dojo.query('.logo-sm', dojo.dom.byId('map')).length > 0) {
        dojo.query('.logo-sm', dojo.dom.byId('map'))[0].id = "esriLogo";
    }

    dojo['dom-class'].add("esriLogo", "esriLogo");
    if (responseObject.SplashScreen.isVisibile) {
        dojo.dom.byId('divSplashScreenContainer').style.display = "block";
        dojo['dom-class'].add(dojo.dom.byId('divSplashScreenContent'), "divSplashScreenDialogContent");
        SetSplashScreenHeight();
    }
    if (isMobileDevice) {
        SetAddressResultsHeight();
        SetViewDetailsHeight();
    }
    dojo.dom.byId("esriLogo").style.bottom = "10px";
}

// Add home button to esri slider and show the initial extent on the click of it

function SetInitialExtent() {
    dojo.create("div", {
        className: "esriSimpleSliderHomeButton",
        onclick: function () {
            if (!isWebMap) {
                var startExtent = responseObject.DefaultExtent.split(',');
                startExtent = new esri.geometry.Extent(parseFloat(startExtent[0]), parseFloat(startExtent[1]), parseFloat(startExtent[2]), parseFloat(startExtent[3]), map.spatialReference);
                map.setExtent(startExtent);
            } else {
                map.setExtent(webmapExtent);
            }
        }
    }, dojo.query(".esriSimpleSliderIncrementButton")[0], "after");
}

//Create graphics and feature layer

function AddLayersToMap() {
    var graphicsLayer = new esri.layers.GraphicsLayer();
    graphicsLayer.id = tempGraphicsLayerId;
    map.addLayer(graphicsLayer);

    if (!isWebMap) {
        setTimeout(function () {
            map.addLayer(AddServiceLayers(countyLayerData.Key, countyLayerData.ServiceURL, countyLayerData.LoadAsServiceType));
            GetDataFromLayers(0);
        }, 50);
    }

    dojo.connect(map, "onClick", function (evt) {
        featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = null;
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

function GetDataFromLayers(index) {
    if (index < permitResultData.length) {
        if (!isWebMap) {
            map.addLayer(AddServiceLayers(permitResultData[index].Title, permitResultData[index].ServiceURL, permitResultData[index].LoadAsServiceType));
        }
        esri.request({
            url: permitResultData[index].ServiceURL + "?f=json",
            load: function (data) {
                for (var p = 0; p < data.fields.length; p++) {
                    if (data.fields[p].type == "esriFieldTypeOID") {
                        permitResultData[index]["InfoWindowSearchField"] = "${" + data.fields[p].name + "}";
                        break;
                    }
                }
                index++;
                GetDataFromLayers(index);
            },
            error: function (err) {
                alert(err.message);
                index++;
                GetDataFromLayers(index);
            }
        });
    }
}

dojo.addOnLoad(Init);