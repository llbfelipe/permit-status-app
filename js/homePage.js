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
var isiOS = false; //This variable will be set to 'true' if the application is accessed from iPhone or iPad
var isBrowser = false; //This variable will be set to 'true' when the application is running on desktop browsers
var isMobileDevice = false; //This variable will be set to 'true' when the application is running on mobile device
var isTablet = false; //This variable will be set to 'true' when the application is running on tablets
var tempGraphicsLayerId = "tempGraphicsLayerID"; //variable to store temporary graphics layer id
var highlightPointGraphicsLayerId = "highlightPointGraphicsLayerId";
var highlightGraphicsLayerId = "highlightGraphicsLayerId";
var mapPoint; //variable to store map point
var selectedMapPoint; // variable to store selected map point
var windowURL = window.location.toString();
var lastSearchString; //variable to store the last search string
var stagedSearch; //variable to store the time limit for search
var lastSearchTime; //variable to store the time of last search
var searchSettings; //variable to store the Search Settings
var countyLayerData; //variable to store the County layer Data
var isCountySearched; //This variable is set to true when county search is performed and is false when permit search is performed
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
var mapExtent = null;
var operationalLayers;
var geometryService;
var searchQueryLayerID;
var webmapBaseMapId;

//This initialization function is called when the DOM elements are ready

function Init() {
    SetAPIDefaults();
    DetectDevice();
    responseObject = new js.config();

    CreateShortcutIcons("shortcut icon", responseObject.ApplicationFavicon);
    if (isMobileDevice || isTablet) {
        CreateShortcutIcons("apple-touch-icon-precomposed", responseObject.ApplicationIcon);
        CreateShortcutIcons("apple-touch-icon", responseObject.ApplicationIcon);
    }

    dojo.dom.byId('divAddressContainer').style.display = "none";
    dojo.dom.byId("tdSearchAddress").innerHTML = responseObject.LocatorSettings.Locators[0].DisplayText;
    dojo.dom.byId("tdSearchLocation").innerHTML = responseObject.LocatorSettings.Locators[1].DisplayText;
    dojo.dom.byId("tdSearchPermit").innerHTML = responseObject.LocatorSettings.Locators[2].DisplayText;
    dojo.dom.byId("txtAddress").value = responseObject.LocatorSettings.Locators[0].LocatorDefaultAddress;
    dojo.dom.byId("txtAddress").setAttribute("defaultAddress", responseObject.LocatorSettings.Locators[0].LocatorDefaultAddress);
    dojo.dom.byId("txtAddress").setAttribute("defaultLocation", responseObject.LocatorSettings.Locators[1].LocatorDefaultLocation);
    dojo.dom.byId("txtAddress").setAttribute("defaultPermit", responseObject.LocatorSettings.Locators[2].LocatorDefaultPermit);
    dojo.dom.byId("txtAddress").style.color = "gray";

    AddressSearchEvents();
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
        dojo['dom-class'].add(imgBasemap, "imgOptions cursorPointer");
        imgBasemap.title = "Switch Basemap";
        imgBasemap.id = "imgBaseMap";
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
    searchSettings = responseObject.SearchSettings;
    countyLayerData = responseObject.CountyLayerData;
    geometryService = new esri.tasks.GeometryService(responseObject.GeometryService);
    LoadErrorMessages();
    dojo.connect(dojo.dom.byId('imgHelp'), "onclick", function () {
        window.open(responseObject.HelpURL);
    });
    if (responseObject.WebMapId) {
        InitializeWebMap();
    } else {
        operationalLayers = responseObject.OperationalLayers;
        InitializeMap();
    }
}

//Events related to search functionality

function AddressSearchEvents() {
    dojo.connect(dojo.byId("imgLocate"), "onclick", function () {
        ValidateLocateType();
    });

    dojo.connect(dojo.dom.byId("txtAddress"), 'onkeyup', InitializeAutocompleteSearch);

    dojo.connect(dojo.dom.byId("txtAddress"), 'onpaste', function (evt) {
        InitializeAutocompleteSearch(evt, true);
    });

    dojo.connect(dojo.dom.byId("txtAddress"), 'oncut', function (evt) {
        InitializeAutocompleteSearch(evt, true);
    });
    dojo.connect(dojo.dom.byId('txtAddress'), "ondblclick", ClearDefaultText);
    dojo.connect(dojo.dom.byId('txtAddress'), "onblur", ReplaceDefaultText);
    dojo.connect(dojo.dom.byId('txtAddress'), "onfocus", function () {
        this.style.color = "#FFF";
    });
}

//Creating application shortcut icons and apple touch icon

function CreateShortcutIcons(iconRel, iconHref) {
    var icon = document.createElement("link");
    icon.rel = iconRel;
    icon.type = "image/x-icon";
    icon.href = iconHref;
    document.getElementsByTagName('head')[0].appendChild(icon);
}

// Initialize autocomplete feature for search

function InitializeAutocompleteSearch(evt, locatorText) {
    if (!responseObject.AutocompleteForPermit && dojo.hasClass(dojo.dom.byId('tdSearchPermit'), "tdSearchByPermit")) {
        return;
    }
    if (locatorText) {
        setTimeout(function () {
            ValidateLocateType();
        }, 100);
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
        //Validations for ignoring keys other than alphabets,numbers,numpad keys,comma,ctl+v,ctrl +x,delete,backspace while performing auto complete search.
        if ((!((evt.keyCode >= 46 && evt.keyCode < 58) || (evt.keyCode > 64 && evt.keyCode < 91) || (evt.keyCode > 95 && evt.keyCode < 106) || evt.keyCode == 8 || evt.keyCode == 110 || evt.keyCode == 188)) || (evt.keyCode == 86 && evt.ctrlKey) || (evt.keyCode == 88 && evt.ctrlKey)) {
            evt = (evt) ? evt : event;
            evt.cancelBubble = true;
            if (evt.stopPropagation) evt.stopPropagation();
            return;
        }
        if (dojo['dom-geometry'].getMarginBox("divAddressContent").h > 0) {
            if (dojo.string.trim(dojo.dom.byId("txtAddress").value) != '') {
                if (lastSearchString != dojo.string.trim(dojo.dom.byId("txtAddress").value)) {
                    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
                    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));

                    // Clear any staged search
                    clearTimeout(stagedSearch);
                    if (dojo.string.trim(dojo.dom.byId("txtAddress").value).length > 0) {
                        // Stage a new search, which will launch if no new searches show up
                        // before the timeout
                        stagedSearch = setTimeout(function () {
                            dojo.dom.byId("imgSearchLoader").style.display = "block";
                            ValidateLocateType();
                            lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
                        }, 500);
                    }
                }
            } else {
                lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
                dojo.dom.byId("imgSearchLoader").style.display = "none";
                dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
                RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            }
        }
    }
}

//Retrieving the data from webmap using the webmap id provided in the config file

function InitializeWebMap() {
    isWebMap = true;
    var mapDeferred = esri.arcgis.utils.createMap(responseObject.WebMapId, "map", {
        mapOptions: {
            slider: true
        },
        ignorePopups: true
    });

    mapDeferred.then(function (response) {
        FetchWebMapData(response);
    }, function (err) {
        alert(err.message);
    });
}

//Fetching the urls and info popup data from the webmap

function FetchWebMapData(response) {
    operationalLayers = [];
    map = response.map;
    webmapBaseMapId = response.itemInfo.itemData.baseMap.baseMapLayers[0].id;
    webmapExtent = response.map.extent;
    baseMapId = response.itemInfo.itemData.baseMap.baseMapLayers[0].id;
    var webMapDetails = response.itemInfo.itemData;
    var serviceTitle = [];
    var p = 0;
    for (var i = 0; i < webMapDetails.operationalLayers.length; i++) {
        var operationalLayerId = dojo.string.trim(webMapDetails.operationalLayers[i].title);
        var str = webMapDetails.operationalLayers[i].url.split('/');
        var lastIndex = str[str.length - 1];
        if (isNaN(lastIndex) || lastIndex == "") {
            if (lastIndex == "") {
                serviceTitle[operationalLayerId] = webMapDetails.operationalLayers[i].url;
            } else {
                serviceTitle[operationalLayerId] = webMapDetails.operationalLayers[i].url + "/";
            }
        } else {
            serviceTitle[operationalLayerId] = webMapDetails.operationalLayers[i].url.substring(0, webMapDetails.operationalLayers[i].url.length - 1);
        }
    }

    for (var index = 0; index < searchSettings.length; index++) {
        if (searchSettings[index].Title && searchSettings[index].QueryLayerId && serviceTitle[searchSettings[index].Title]) {
            searchSettings[index].QueryURL = serviceTitle[searchSettings[index].Title] + searchSettings[index].QueryLayerId;
            for (var j = 0; j < webMapDetails.operationalLayers.length; j++) {
                if (webMapDetails.operationalLayers[j].title && serviceTitle[webMapDetails.operationalLayers[j].title] && (webMapDetails.operationalLayers[j].title == searchSettings[index].Title)) {
                    if (webMapDetails.operationalLayers[j].layers) {
                        //Fetching infopopup data in case the layers are added as dynamic layers in the webmap
                        for (var k = 0; k < webMapDetails.operationalLayers[j].layers.length; k++) {
                            var layerInfo = webMapDetails.operationalLayers[j].layers[k];
                            if (webMapDetails.operationalLayers[j].layers[k].popupInfo) {
                                operationalLayers[p] = {};
                                operationalLayers[p]["ServiceURL"] = webMapDetails.operationalLayers[j].url + "/" + webMapDetails.operationalLayers[j].layers[k].id;
                                p++;
                                if (layerInfo.popupInfo.title.split("{").length > 1) {
                                    searchSettings[index]["InfoWindowHeader"] = dojo.string.trim(layerInfo.popupInfo.title.split("{")[0]) + " ";
                                    for (var l = 1; l < layerInfo.popupInfo.title.split("{").length; l++) {
                                        searchSettings[index]["InfoWindowHeader"] += "${" + dojo.string.trim(layerInfo.popupInfo.title.split("{")[l]);
                                    }
                                } else {
                                    if (dojo.string.trim(layerInfo.popupInfo.title) != "") {
                                        searchSettings[index]["InfoWindowHeader"] = dojo.string.trim(layerInfo.popupInfo.title);
                                    } else {
                                        searchSettings[index]["InfoWindowHeader"] = responseObject.ShowNullValueAs;
                                    }
                                }
                                GetMobileCalloutContentField(index);
                                searchSettings[index]["InfoWindowData"] = [];
                                for (var field in layerInfo.popupInfo.fieldInfos) {
                                    if (layerInfo.popupInfo.fieldInfos.hasOwnProperty(field)) {
                                        if (layerInfo.popupInfo.fieldInfos[field].visible) {
                                            searchSettings[index]["InfoWindowData"].push({
                                                "DisplayText": layerInfo.popupInfo.fieldInfos[field].label + ":",
                                                "FieldName": "${" + layerInfo.popupInfo.fieldInfos[field].fieldName + "}"
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    } else if (webMapDetails.operationalLayers[j].popupInfo) {
                        //Fetching infopopup data in case the layers are added as feature layers in the webmap
                        operationalLayers[p] = {};
                        operationalLayers[p]["ServiceURL"] = webMapDetails.operationalLayers[j].url;
                        p++;
                        if (webMapDetails.operationalLayers[j].popupInfo.title.split("{").length > 1) {
                            searchSettings[index]["InfoWindowHeader"] = dojo.string.trim(webMapDetails.operationalLayers[j].popupInfo.title.split("{")[0]);
                            for (var l = 1; l < webMapDetails.operationalLayers[j].popupInfo.title.split("{").length; l++) {
                                searchSettings[index]["InfoWindowHeader"] += " ${" + dojo.string.trim(webMapDetails.operationalLayers[j].popupInfo.title.split("{")[l]);
                            }
                        } else {
                            if (dojo.string.trim(webMapDetails.operationalLayers[j].popupInfo.title) != "") {
                                searchSettings[index]["InfoWindowHeader"] = dojo.string.trim(webMapDetails.operationalLayers[j].popupInfo.title);
                            } else {
                                searchSettings[index]["InfoWindowHeader"] = responseObject.ShowNullValueAs;
                            }
                        }
                        if (webMapDetails.operationalLayers[j].layerObject.displayField) {
                            searchSettings[index]["InfoWindowContent"] = "${" + webMapDetails.operationalLayers[j].layerObject.displayField + "}";
                        } else {
                            GetMobileCalloutContentField(index);
                        }
                        searchSettings[index]["InfoWindowData"] = [];
                        for (var field in webMapDetails.operationalLayers[j].popupInfo.fieldInfos) {
                            if (webMapDetails.operationalLayers[j].popupInfo.fieldInfos.hasOwnProperty(field)) {
                                if (webMapDetails.operationalLayers[j].popupInfo.fieldInfos[field].visible) {
                                    searchSettings[index]["InfoWindowData"].push({
                                        "DisplayText": webMapDetails.operationalLayers[j].popupInfo.fieldInfos[field].label + ":",
                                        "FieldName": "${" + webMapDetails.operationalLayers[j].popupInfo.fieldInfos[field].fieldName + "}"
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } else {
            alert(messages.getElementsByTagName("webmapTitleError")[0].childNodes[0].nodeValue);
        }
    }
    GetCountyDataFromWebmap(webMapDetails);
    //Overriding the infowindow coming from the webmap
    dojo.destroy(map.infoWindow);
    var infoWindow = new js.InfoWindow({
        domNode: dojo.create("div", null, dojo.dom.byId("map"))
    });
    map.infoWindow = infoWindow;
    AddLayersToMap();
    MapOnLoad();
    CreateBaseMapComponent();
}

//Getting county layer data from the webmap. The layer without infopopup is considered as county layer.

function GetCountyDataFromWebmap(webMapDetails) {
    for (var i = 0; i < webMapDetails.operationalLayers.length; i++) {
        var countyLayerId = webMapDetails.operationalLayers[i].title;
        if (webMapDetails.operationalLayers[i].layers) {
            if (webMapDetails.operationalLayers[i].layerObject) {
                for (var k = 0; k < webMapDetails.operationalLayers[i].layerObject.layerInfos.length; k++) {
                    if (webMapDetails.operationalLayers[i].layerObject.__popupIds) {
                        if (dojo.indexOf(webMapDetails.operationalLayers[i].layerObject.__popupIds, webMapDetails.operationalLayers[i].layerObject.layerInfos[k].id) < 0) {
                            if (!webMapDetails.operationalLayers[i].layerObject.layerInfos[k].subLayerIds) {
                                FetchCountyLayerData(countyLayerId, webMapDetails.operationalLayers[i].url + "/" + webMapDetails.operationalLayers[i].layerObject.layerInfos[k].id);
                            }
                        }
                    } else {
                        FetchCountyLayerData(countyLayerId, webMapDetails.operationalLayers[i].url + "/" + webMapDetails.operationalLayers[i].layerObject.layerInfos[k].id);
                    }
                }
            }
        } else {
            if (!webMapDetails.operationalLayers[i].popupInfo) {
                FetchCountyLayerData(countyLayerId, webMapDetails.operationalLayers[i].url);
            }
        }
    }
}

// Store county layer data coming from webmap

function FetchCountyLayerData(operationalLayerId, url) {
    countyLayerData.Title = operationalLayerId;
    countyLayerData.ServiceURL = url;
    if ((dojo.string.trim(responseObject.CountyLayerData.SearchExpression) && dojo.string.trim(responseObject.CountyLayerData.CountyDisplayField)) && (countyLayerData.UseGeocoderService == true || countyLayerData.UseGeocoderService == false)) {
        countyLayerData.SearchExpression = responseObject.CountyLayerData.SearchExpression;
        countyLayerData.CountyDisplayField = responseObject.CountyLayerData.CountyDisplayField;
    } else if (((!dojo.string.trim(responseObject.CountyLayerData.SearchExpression)) || (!dojo.string.trim(responseObject.CountyLayerData.CountyDisplayField))) && (responseObject.CountyLayerData.UseGeocoderService == false)) {
        alert(messages.getElementsByTagName("noCountyLayer")[0].childNodes[0].nodeValue);
    }
    countyLayerData.UseGeocoderService = responseObject.CountyLayerData.UseGeocoderService;
}

// Get data to be displayed in mobile callout content field

function GetMobileCalloutContentField(index) {
    var def = new dojo.Deferred();
    esri.request({
        url: searchSettings[index].QueryURL + '?f=json',
        load: function (data) {
            if (data.displayField) {
                searchSettings[index]["InfoWindowContent"] = "${" + data.displayField + "}";
            } else {
                for (var i = 0; i < data.fields.length; i++) {
                    if (data.fields[i].type != "esriFieldTypeOID") {
                        searchSettings[index]["InfoWindowContent"] = "${" + data.fields[i].name + "}";
                        break;
                    }
                }
            }
            def.resolve();
        }
    });
    return def;
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
            var baseMapURLCount = 0;
            for (var i = 0; i < responseObject.BaseMapLayers.length; i++) {
                if (responseObject.BaseMapLayers[i].MapURL) {
                    baseMapURLCount++;
                }
            }
            if (baseMapURLCount == 0) {
                alert(messages.getElementsByTagName("noBaseMapURL")[0].childNodes[0].nodeValue);
                HideProgressIndicator();
            }
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
        infoWindow: infoWindow,
        navigationMode: "css-transforms"
    });

    dojo.connect(map, "onLoad", function () {
        AddLayersToMap();
        MapOnLoad();
    });
    CreateBaseMapComponent();
    //The following code is for adding reference overlay layer to the map
    if (responseObject.ReferenceOverlayLayer) {
        if (responseObject.ReferenceOverlayLayer.DisplayOnLoad && responseObject.ReferenceOverlayLayer.ServiceUrl) {
            var layerType = responseObject.ReferenceOverlayLayer.ServiceUrl.substring(((responseObject.ReferenceOverlayLayer.ServiceUrl.lastIndexOf("/")) + 1), (responseObject.ReferenceOverlayLayer.ServiceUrl.length));
            if (!isNaN(layerType) && (layerType != "")) {
                var overlaymap = new esri.layers.FeatureLayer(responseObject.ReferenceOverlayLayer.ServiceUrl, {
                    mode: esri.layers.FeatureLayer.MODE_SNAPSHOT,
                    outFields: ["*"]
                });
                overlaymap.setMaxAllowableOffset(10)
                map.addLayer(overlaymap);

            } else {
                var layerUrl = responseObject.ReferenceOverlayLayer.ServiceUrl + "?f=json";
                esri.request({
                    url: layerUrl,
                    handleAs: "json",
                    load: function (data) {
                        if (!data.tileInfo) {
                            var imageParameters = new esri.layers.ImageParameters();
                            //Takes a URL to a non cached map service.
                            var overlaymap = new esri.layers.ArcGISDynamicMapServiceLayer(responseObject.ReferenceOverlayLayer.ServiceUrl, {
                                "imageParameters": imageParameters
                            });
                            map.addLayer(overlaymap);

                        } else {
                            var overlaymap = new esri.layers.ArcGISTiledMapServiceLayer(responseObject.ReferenceOverlayLayer.ServiceUrl);
                            map.addLayer(overlaymap);
                        }
                    },
                    error: function (err) {
                        alert(messages.getElementsByTagName("refrenceOverlayError")[0].childNodes[0].nodeValue);
                    }
                });
            }
        }
    }
}

//Operations to be performed after the map has been loaded

function MapOnLoad() {
    map.disableKeyboardNavigation();
    if (!isWebMap) {
        var serviceTitle = [];
        for (var i = 0; i < operationalLayers.length; i++) {
            if (operationalLayers[i].ServiceURL) {
                var str = operationalLayers[i].ServiceURL.split('/');
                var lastIndex = str[str.length - 1];
                if (isNaN(lastIndex) || lastIndex == "") {
                    if (lastIndex == "") {
                        var layerTitle = str[str.length - 3];
                        serviceTitle[layerTitle] = operationalLayers[i].ServiceURL;
                    } else {
                        var layerTitle = str[str.length - 2];
                        serviceTitle[layerTitle] = operationalLayers[i].ServiceURL + "/";
                    }
                } else {
                    var layerTitle = str[str.length - 3];
                    serviceTitle[layerTitle] = operationalLayers[i].ServiceURL.substring(0, operationalLayers[i].ServiceURL.length - 1);
                }
            } else {
                operationalLayers.splice(i, 1);
                i--;
            }
        }

        if (responseObject.InfoWindowSettings.length == searchSettings.length) {
            var count = 0;
            for (var index = 0; index < searchSettings.length; index++) {
                if (searchSettings[index].Title && searchSettings[index].QueryLayerId && serviceTitle[searchSettings[index].Title]) {
                    searchSettings[index].QueryURL = serviceTitle[searchSettings[index].Title] + searchSettings[index].QueryLayerId;
                    for (var j = 0; j < responseObject.InfoWindowSettings.length; j++) {
                        if (responseObject.InfoWindowSettings[j].Title && responseObject.InfoWindowSettings[j].QueryLayerId && serviceTitle[responseObject.InfoWindowSettings[j].Title] && (responseObject.InfoWindowSettings[j].Title == searchSettings[index].Title) && (responseObject.InfoWindowSettings[j].QueryLayerId == searchSettings[index].QueryLayerId)) {
                            count++;
                            searchSettings[index]["InfoWindowHeader"] = responseObject.InfoWindowSettings[j].InfoWindowHeader;
                            searchSettings[index]["InfoWindowContent"] = responseObject.InfoWindowSettings[j].InfoWindowContent;
                            searchSettings[index]["InfoWindowData"] = responseObject.InfoWindowSettings[j].InfoWindowData;
                        }
                    }
                } else {
                    alert(messages.getElementsByTagName("layerTitleError")[0].childNodes[0].nodeValue);
                }
            }
            for (var x = 0; x < searchSettings.length; x++) {
                if (!searchSettings[x].QueryURL) {
                    searchSettings.splice(x, 1);
                    x--;
                }
            }
            if (count != responseObject.InfoWindowSettings.length) {
                alert(messages.getElementsByTagName("titleNotMatching")[0].childNodes[0].nodeValue);
            }
        } else {
            alert(messages.getElementsByTagName("lengthDoNotMatch")[0].childNodes[0].nodeValue);
        }
    }
    var url = esri.urlToObject(window.location.toString());
    //Code for sharing the application
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
                //Sharing infowindow when we get an infowindow or permit list on map click
                var splitPoint = selectedPoint.split(',');
                var sPoint = new esri.geometry.Point(parseFloat(splitPoint[0]), parseFloat(splitPoint[1]), map.spatialReference);
                var tempFeatureID = tempSelectedPoint.split("$featureID=")[1];
                if (selectedPermit.split("$featureID=").length > 1 && tempFeatureID.split("$infoWindowLayerID=").length > 1) {
                    //sharing infowindow when a permit is selected from the list of permits which is displayed on map click
                    shareFlag = true;
                    featureID = tempFeatureID.split("$infoWindowLayerID=")[0];
                    infoWindowLayerID = tempFeatureID.split("$infoWindowLayerID=")[1];
                }
                FindPermits(sPoint);
            });
        } else if (url.query.extent.split("$searchFeatureID=").length > 0) {
            //Sharing infowindow when we user performs a location or permit search and locates a permit on the map
            var tempFeatureID = url.query.extent.split("$searchFeatureID=")[1];
            if (tempFeatureID) {
                if (tempFeatureID.split("$searchInfoWindowLayerID=").length > 1) {
                    addressSearchFlag = true;
                    searchFeatureID = tempFeatureID.split("$searchInfoWindowLayerID=")[0];
                    var tempQueryLayerID = tempFeatureID.split("$searchInfoWindowLayerID=")[1];
                    if (tempQueryLayerID.split("$searchQueryLayerID=").length > 1) {
                        searchInfoWindowLayerID = tempQueryLayerID.split("$searchQueryLayerID=")[0];
                        searchQueryLayerID = tempQueryLayerID.split("$searchQueryLayerID=")[1];
                    }
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
            map.setExtent(mapExtent, true);
        }
    }

    if (!currentExtent) {
        mapExtent = decodeURIComponent(extent).split(',');
        mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
        map.setExtent(mapExtent);
        if (!addressSearchFlag) {
            extent = "";
        }
    }
    CreateSliderHomeButton();
    if (dojo.query('.logo-med', dojo.dom.byId('map')).length > 0) {
        dojo.query('.logo-med', dojo.dom.byId('map'))[0].id = "esriLogo";
    } else if (dojo.query('.logo-sm', dojo.dom.byId('map')).length > 0) {
        dojo.query('.logo-sm', dojo.dom.byId('map'))[0].id = "esriLogo";
    }

    dojo['dom-class'].add("esriLogo", "esriLogo");
    if (responseObject.SplashScreen.isVisible) {
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

function CreateSliderHomeButton() {
    dojo.create("div", {
        className: "esriSimpleSliderHomeButton",
        onclick: function () {
            if (!isWebMap) {
                var startExtent = responseObject.DefaultExtent.split(',');
                startExtent = new esri.geometry.Extent(parseFloat(startExtent[0]), parseFloat(startExtent[1]), parseFloat(startExtent[2]), parseFloat(startExtent[3]), map.spatialReference);
                map.setExtent(startExtent, true);
            } else {
                map.setExtent(webmapExtent, true);
            }
        }
    }, dojo.query(".esriSimpleSliderIncrementButton")[0], "after");
}

//Create graphics and feature layer

function AddLayersToMap() {
    var graphicsLayer = new esri.layers.GraphicsLayer();
    graphicsLayer.id = tempGraphicsLayerId;
    map.addLayer(graphicsLayer);

    var graphicsLayer = new esri.layers.GraphicsLayer();
    graphicsLayer.id = highlightGraphicsLayerId;
    map.addLayer(graphicsLayer);

    var graphicsLayer = new esri.layers.GraphicsLayer();
    graphicsLayer.id = highlightPointGraphicsLayerId;
    map.addLayer(graphicsLayer);
    if (!isWebMap) {
        setTimeout(function () {
            if (countyLayerData && (dojo.string.trim(countyLayerData.ServiceURL) && dojo.string.trim(countyLayerData.SearchExpression) && dojo.string.trim(countyLayerData.CountyDisplayField)) && (countyLayerData.UseGeocoderService == true || countyLayerData.UseGeocoderService == false)) {
                if (countyLayerData.LoadAsServiceType) {
                    AddServiceLayers(countyLayerData.Title, countyLayerData.ServiceURL, countyLayerData.LoadAsServiceType);
                } else {
                    AddServiceLayers(countyLayerData.Title, countyLayerData.ServiceURL, "dynamic");
                }
            } else if (countyLayerData && ((!dojo.string.trim(countyLayerData.ServiceURL)) || (!dojo.string.trim(countyLayerData.SearchExpression)) || (!dojo.string.trim(countyLayerData.CountyDisplayField))) && (countyLayerData.UseGeocoderService == false)) {
                alert(messages.getElementsByTagName("noCountyLayer")[0].childNodes[0].nodeValue);
            }
            for (var index = 0; index < operationalLayers.length; index++) {
                var str = operationalLayers[index].ServiceURL.split('/');
                var lastIndex = str[str.length - 1];
                if (isNaN(lastIndex) || lastIndex == "") {
                    if (lastIndex == "") {
                        var layerTitle = str[str.length - 3];
                    } else {
                        var layerTitle = str[str.length - 2];
                    }
                } else {
                    var layerTitle = str[str.length - 3];
                }
                AddServiceLayers(layerTitle, operationalLayers[index].ServiceURL, operationalLayers[index].LoadAsServiceType);
            }
        }, 50);
    }

    dojo.connect(map, "onClick", function (evt) {
        ShowProgressIndicator()
        featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = null;
        addressSearchFlag = false;
        map.infoWindow.hide();
        map.getLayer(highlightGraphicsLayerId).clear();
        HideRipple();
        evt.mapPoint.spatialReference = map.spatialReference;
        FindPermits(evt.mapPoint);
    });

    dojo.connect(map, "onExtentChange", function () {
        SetMapTipPosition();
        if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
            ShareLink();
        }
    });

    window.onresize = function() {
        if (!isMobileDevice) {
            ResizeHandler();
        } else {
            OrientationChanged();
        }
    };
}

dojo.addOnLoad(Init);