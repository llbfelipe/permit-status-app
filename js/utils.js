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
var orientationChange = false; //variable for setting the flag on orientation
var tinyResponse; //variable for storing the response from tiny URL API
var tinyUrl; //variable for storing the tiny URL
var counter;
var featureArray = [];
var point = null;
var currentExtent; //variable for storing the current map extent for sharing

//Remove scroll bar

function RemoveScrollBar(container) {
    if (dojo.dom.byId(container.id + 'scrollbar_track')) {
        container.removeChild(dojo.dom.byId(container.id + 'scrollbar_track'));
    }
}

//Clear graphics on map

function ClearGraphics(graphicsLayer) {
    if (map.getLayer(graphicsLayer)) {
        map.getLayer(graphicsLayer).clear();
    }
}

//Function to append ... for a long string

function TrimString(str, len) {
    return (str.length > len) ? str.substring(0, len) + "..." : str;
}

//Get extent from point to query the layer

function ExtentFromPoint(point) {
    var tolerance = (isMobileDevice) ? 15 : 10;
    var screenPoint = map.toScreen(point);
    var pnt1 = new esri.geometry.Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
    var pnt2 = new esri.geometry.Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
    var mapPoint1 = map.toMap(pnt1);
    var mapPoint2 = map.toMap(pnt2);
    return new esri.geometry.Extent(mapPoint1.x, mapPoint1.y, mapPoint2.x, mapPoint2.y, map.spatialReference);
}

// Search for permits when user clicks on the map

function FindPermits(mapPoint) {
    featureArray = [];
    counter = 0;
    for (var index = 0; index < searchSettings.length; index++) {
        ExecuteQueryTask(index, mapPoint);
    }
}

//Perform queryTask on map layers

function ExecuteQueryTask(index, mapPoint) {
    var queryTask = new esri.tasks.QueryTask(searchSettings[index].QueryURL);
    var query = new esri.tasks.Query();
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.geometry = ExtentFromPoint(mapPoint);
    var permitName;
    searchSettings[index].ListFieldName.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, function (match, key) {
        permitName = key;
    });
    query.orderByFields = [permitName];
    query.outFields = ["*"];
    queryTask.execute(query, function (result) {
        FetchQueryResults(result, index, mapPoint);
    }, function (err) {
        HideProgressIndicator();
        alert(dojo.string.substitute(messages.getElementsByTagName("dataNotFound")[0].childNodes[0].nodeValue, [searchSettings[index].Title]));
        FetchQueryResults();
    });
}

//Store the query results in an array and determine if the results contain a single permit or a list of permits

function FetchQueryResults(result, index, mapPoint) {
    counter++;
    if (result) {
        if (result.features.length > 0) {
            for (var i = 0; i < result.features.length; i++) {
                featureArray.push({
                    attr: result.features[i],
                    layerId: index,
                    fields: result.fields
                });
            }
        }
    }
    if (counter == searchSettings.length) {
        if (featureArray.length > 0) {
            currentExtent = map.extent;
            if (!isMobileDevice) {
                if (featureArray.length == 1) {
                    //Show details in an infowindow when a single result is fetched on map click
                    dojo.dom.byId("tdList").style.display = "none";
                    ShowInfoWindowDetails(featureArray[0].attr.geometry, featureArray[0].attr.attributes, featureArray.length, featureArray[0].layerId, mapPoint, featureArray[0].fields);
                } else {
                    //Show list of permits in an infowindow when multiple results are found at a particular point on map click
                    ShowPermitList(mapPoint, featureArray, featureArray[0].attr.geometry);
                    dojo.dom.byId("tdList").onclick = function () {
                        featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = null;
                        ShowPermitList(mapPoint, featureArray, featureArray[0].attr.geometry);
                    };
                }
            } else {
                HideProgressIndicator();
                ShowMobileInfoDetails(mapPoint, featureArray, featureArray[0].attr.geometry);
            }
        } else {
            map.infoWindow.hide();
            selectedMapPoint = null;
            alert(messages.getElementsByTagName("unableToLocatePermit")[0].childNodes[0].nodeValue);
            HideProgressIndicator();
        }

    }
}

//Display InfoWindow for mobile device on performing search

function ShowMobileInfoWindow(mapPoint, attributes, layerID, fields) {
    ClearGraphics(tempGraphicsLayerId);
    map.infoWindow.setTitle("");
    map.infoWindow.setContent("");
    selectedMapPoint = GetGeometryType(mapPoint);
    point = selectedMapPoint;
    map.infoWindow.resize(225, 65);
    currentExtent = map.extent;
    SetFeatureZoomLevel(mapPoint, selectedMapPoint, false);
    FormatNullValues(attributes);
    try {
        map.infoWindow.setTitle(TrimString(dojo.string.substitute(searchSettings[layerID].InfoWindowHeader, attributes), 15));
        map.infoWindow.setContent(TrimString(dojo.string.substitute(searchSettings[layerID].InfoWindowContent, attributes), 15));
    } catch (e) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
    }
    dojo.connect(map.infoWindow.imgDetailsInstance(), "onclick", function () {
        dojo.dom.byId("tdList").style.display = "none";
        ShowInfoWindowDetails(mapPoint, attributes, null, layerID, null, fields);
    });
    HideProgressIndicator();
}

//Display InfoWindow for mobile device on map click

function ShowMobileInfoDetails(mapPoint, featureArray, geometry) {
    map.infoWindow.setTitle("");
    map.infoWindow.setContent("");
    ClearGraphics(tempGraphicsLayerId);
    selectedMapPoint = GetGeometryType(geometry);
    point = mapPoint;
    map.infoWindow.resize(225, 65);
    currentExtent = map.extent;

    if (featureArray.length == 1) {
        SetFeatureZoomLevel(geometry, selectedMapPoint, false);
        FormatNullValues(featureArray[0].attr.attributes);
        try {
            map.infoWindow.setTitle(TrimString(dojo.string.substitute(searchSettings[featureArray[0].layerId].InfoWindowHeader, featureArray[0].attr.attributes), 15));
            map.infoWindow.setContent(TrimString(dojo.string.substitute(searchSettings[featureArray[0].layerId].InfoWindowContent, featureArray[0].attr.attributes), 15));
        } catch (e) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        }
    } else {
        SetInfoWindowPosition(selectedMapPoint, 0);
        try {
            map.infoWindow.setTitle(TrimString(dojo.string.substitute(messages.getElementsByTagName("numberOfFeaturesFoundOnMobile")[0].childNodes[0].nodeValue, [featureArray.length]), 15));
        } catch (e) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        }
    }
    dojo.connect(map.infoWindow.imgDetailsInstance(), "onclick", function () {
        if (featureArray.length == 1) {
            dojo.dom.byId("tdList").style.display = "none";
            ShowInfoWindowDetails(mapPoint, featureArray[0].attr.attributes, featureArray.length, featureArray[0].layerId, null, featureArray[0].fields);
        } else {
            ShowPermitList(featureArray[0].attr.geometry, featureArray);
            dojo.dom.byId("tdList").onclick = function () {
                ShowPermitList(featureArray[0].attr.geometry, featureArray);
            };
        }
    });
}

//Substitute string value for null values present in attributes

function FormatNullValues(attributes) {
    for (var i in attributes) {
        if (attributes.hasOwnProperty(i)) {
            if (!attributes[i]) {
                attributes[i] = responseObject.ShowNullValueAs;
            }
        }
    }
}

//Display list of permits in InfoWindow on map click

function ShowPermitList(mapPoint, result, geometry) {
    ClearGraphics(tempGraphicsLayerId);
    dojo.dom.byId("divPermitDataScrollContainer").style.display = "block";
    dojo.dom.byId("tdList").style.display = "none";
    dojo.dom.byId("divInfoDetails").style.display = "none";
    dojo['dom-construct'].empty(dojo.dom.byId("divPermitScrollContent"));
    var tblPermitList = document.createElement("table");
    dojo.dom.byId("divPermitScrollContent").appendChild(tblPermitList);
    tblPermitList.style.width = "100%";
    tblPermitList.style.textAlign = "left";
    tblPermitList.style.overflow = "hidden";
    var tbodyPermitList = document.createElement("tbody");
    tblPermitList.appendChild(tbodyPermitList);

    for (var i = 0; i < result.length; i++) {
        var trPermitList = document.createElement("tr");
        trPermitList.className = "trRowHeight";
        for (var j = 0; j < featureArray[i].fields.length; j++) {
            if (featureArray[i].fields[j].type == "esriFieldTypeOID") {
                var objID = featureArray[i].fields[j].name;
                break;
            }
        }
        trPermitList.id = featureArray[i].attr.attributes[objID];
        tbodyPermitList.appendChild(trPermitList);
        var tdDisplayText = document.createElement("td");
        tdDisplayText.className = "cursorPointer";
        tdDisplayText.innerHTML = searchSettings[result[i].layerId].ListDisplayText;

        var tdFieldName = document.createElement("td");
        tdFieldName.className = "cursorPointer";
        try {
            tdFieldName.innerHTML = dojo.string.substitute(searchSettings[result[i].layerId].ListFieldName, result[i].attr.attributes);
        } catch (e) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        }

        if (featureArray[i].attr.attributes[objID] == Number(featureID)) {
            var index = i;
        }
        trPermitList.onclick = function () {
            featureID = this.id;
            infoWindowLayerID = searchSettings[featureArray[this.rowIndex].layerId].Title;
            ShowInfoWindowDetails(featureArray[this.rowIndex].attr.geometry, featureArray[this.rowIndex].attr.attributes, featureArray.length, featureArray[this.rowIndex].layerId, mapPoint, featureArray[this.rowIndex].fields);
        };
        trPermitList.appendChild(tdDisplayText);
        trPermitList.appendChild(tdFieldName);
    }
    if (!isMobileDevice) {
        dojo.dom.byId('divInfoContent').style.display = "block";
        dojo.dom.byId('divInfoContent').style.width = responseObject.InfoPopupWidth + "px";
        dojo.dom.byId('divInfoContent').style.height = responseObject.InfoPopupHeight + "px";
        dojo.dom.byId('tdInfoHeader').innerHTML = dojo.string.substitute(messages.getElementsByTagName("numberOfFeaturesFound")[0].childNodes[0].nodeValue, [result.length]);
        map.infoWindow.resize(responseObject.InfoPopupWidth, responseObject.InfoPopupHeight);
        selectedMapPoint = GetGeometryType(geometry);
        point = mapPoint;
        SetInfoWindowPosition(selectedMapPoint, 2);
    } else {
        dojo.dom.byId('divInfoContainer').style.display = "block";
        dojo['dom-class'].replace("divInfoContainer", "opacityShowAnimation", "opacityHideAnimation");
        dojo['dom-class'].add("divInfoContainer", "divInfoContainer");
        dojo['dom-class'].replace("divInfoContent", "showContainer", "hideContainer");
        dojo['dom-class'].add("divInfoContent", "divInfoContent");
        dojo.dom.byId('tdInfoHeader').innerHTML = dojo.string.substitute(messages.getElementsByTagName("numberOfFeaturesFoundOnMobile")[0].childNodes[0].nodeValue, [result.length]);
        SetPermitDataHeight();
    }
    if (featureID && infoWindowLayerID && shareFlag) {
        ShowInfoWindowDetails(featureArray[index].attr.geometry, featureArray[index].attr.attributes, featureArray.length, featureArray[index].layerId, mapPoint, featureArray[index].fields);
    }
}

//Display InfoWindow

function ShowInfoWindowDetails(geometry, attributes, featureLength, layer, mapPoint, fields) {
    ClearGraphics(tempGraphicsLayerId);
    dojo.dom.byId("tdList").style.display = "none";
    dojo.dom.byId("divPermitDataScrollContainer").style.display = "none";
    dojo['dom-construct'].empty(dojo.dom.byId("divPermitScrollContent"));
    if (featureLength > 1) {
        dojo.dom.byId("tdList").style.display = "block";
    }
    for (var index in attributes) {
        if (attributes.hasOwnProperty(index)) {
            if (!attributes[index] || attributes[index] == " ") {
                attributes[index] = responseObject.ShowNullValueAs;
            }
        }
    }
    try {
        var value = dojo.string.trim(dojo.string.substitute(searchSettings[layer].InfoWindowHeader, attributes));
    } catch (e) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
    }
    if (isBrowser) {
        value = TrimString(value, Math.round(responseObject.InfoPopupWidth / 6));
    } else {
        value = TrimString(value, Math.round(responseObject.InfoPopupWidth / 10));
    }

    if (!isMobileDevice) {
        map.infoWindow.hide();
        selectedMapPoint = null;
        dojo.dom.byId('divInfoContent').style.display = "block";
        dojo.dom.byId('divInfoContent').style.width = responseObject.InfoPopupWidth + "px";
        dojo.dom.byId('divInfoContent').style.height = responseObject.InfoPopupHeight + "px";
        dojo.dom.byId("divInfoDetails").style.display = "block";
        map.infoWindow.resize(responseObject.InfoPopupWidth, responseObject.InfoPopupHeight);
        selectedMapPoint = GetGeometryType(geometry);
        point = mapPoint;
        SetFeatureZoomLevel(geometry, selectedMapPoint, true);
    } else {
        dojo.dom.byId('divInfoContainer').style.display = "block";
        dojo['dom-class'].replace("divInfoContainer", "opacityShowAnimation", "opacityHideAnimation");
        dojo['dom-class'].add("divInfoContainer", "divInfoContainer");
        dojo['dom-class'].replace("divInfoContent", "showContainer", "hideContainer");
        dojo['dom-class'].add("divInfoContent", "divInfoContent");
        dojo.dom.byId("divInfoDetails").style.display = "block";
    }
    dojo['dom-construct'].empty(dojo.dom.byId('tblInfoDetails'));
    dojo.dom.byId('tdInfoHeader').innerHTML = value;
    var tblInfoDetails = dojo.dom.byId('tblInfoDetails');
    var tbodyInfoDetails = document.createElement("tbody");
    tblInfoDetails.appendChild(tbodyInfoDetails);
    for (var j = 0; j < fields.length; j++) {
        if (fields[j].type == "esriFieldTypeDate") {
            if (attributes[fields[j].name]) {
                if (Number(attributes[fields[j].name])) {
                    var date = new js.date();
                    var utcMilliseconds = Number(attributes[fields[j].name]);
                    attributes[fields[j].name] = dojo.date.locale.format(date.utcTimestampFromMs(utcMilliseconds), {
                        datePattern: responseObject.FormatDateAs,
                        selector: "date"
                    });
                }
            }
        }
    }
    try {
        for (var index = 0; index < searchSettings[layer].InfoWindowData.length; index++) {
            var trInfoDetails = document.createElement("tr");
            tbodyInfoDetails.appendChild(trInfoDetails);
            if (searchSettings[layer].InfoWindowData[index].DisplayText && (searchSettings[layer].InfoWindowData[index].DisplayText != "")) {
                CreateTableRow(trInfoDetails, searchSettings[layer].InfoWindowData[index].DisplayText, dojo.string.substitute(searchSettings[layer].InfoWindowData[index].FieldName, attributes));
            } else {
                var tempValue = searchSettings[layer].InfoWindowData[index].FieldName.split("{");
                var fieldName = tempValue[1].split("}");
                for (var j = 0; j < fields.length; j++) {
                    if (fields[j].alias == fieldName[0]) {
                        CreateTableRow(trInfoDetails, fields[j].alias + ":", dojo.string.substitute(searchSettings[layer].InfoWindowData[index].FieldName, attributes));
                        break;
                    }
                }
            }
        }
    } catch (e) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        zoomDeferred.cancel();
        map.infoWindow.hide();
        selectedMapPoint = null;
    }
    SetViewDetailsHeight();
}

//Fetch the geometry type of the mapPoint

function GetGeometryType(geometry) {
    if (geometry.type != "polygon") {
        selectedMapPoint = geometry;
    } else {
        var mapPoint = geometry.getExtent().getCenter();
        if (!geometry.contains(mapPoint)) {
            //if the center of the polygon does not lie within the polygon
            var rings = Math.floor(geometry.rings.length / 2);
            var points = Math.floor(geometry.rings[rings].length / 2);
            selectedMapPoint = geometry.getPoint(rings, points)
        } else {
            //if the center of the polygon lies within the polygon
            selectedMapPoint = geometry.getExtent().getCenter();
        }
    }
    return selectedMapPoint;
}

//Set the zoom level for features according to the 'ZoomToPolygonGeometry' tag set in the config file

function SetFeatureZoomLevel(geometry, selectedMapPoint, flag) {
    if (geometry.type == "point") {
        SetZoomLevel(selectedMapPoint);
    } else {
        if (responseObject.ZoomToPolygonGeometry) {
            map.infoWindow.hide();
            //set the extent of the polygon and move it down vertically so that the infowindow is completely visible
            var ext = geometry.getExtent().expand(3);
            ext.ymin = ext.ymin + ext.getHeight() / 4;
            ext.ymax = ext.ymax + ext.getHeight() / 4;
            map.setExtent(ext, true);
            var screenPoint = map.toScreen(selectedMapPoint);
            screenPoint.y = map.height - screenPoint.y;
            map.infoWindow.show(screenPoint);
            HideProgressIndicator();
            if (extent != "") {
                mapExtent = extent.split(',');
                mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
                map.setExtent(mapExtent);
                extent = "";
            }
        } else {
            SetZoomLevel(selectedMapPoint);
        }
    }
}

function SetZoomLevel(selectedMapPoint) {
    if (map.getLevel() != responseObject.ZoomLevel) {
        var zoomDeferred = map.centerAndZoom(selectedMapPoint, responseObject.ZoomLevel);
        map.infoWindow.hide();
        zoomDeferred.then(function () {
            SetInfoWindowPosition(selectedMapPoint, 1);
        });
    } else {
        SetInfoWindowPosition(selectedMapPoint, 1);
    }
}

// Position the infowindow to the center of the map

function SetInfoWindowPosition(selectedMapPoint, flag) {
    var extentDeferred = map.setExtent(CalculateMapExtent(selectedMapPoint), true);
    map.infoWindow.hide();
    extentDeferred.then(function () {
        HideProgressIndicator();
        map.infoWindow.hide();
        var screenPoint = map.toScreen(selectedMapPoint);
        screenPoint.y = map.height - screenPoint.y;
        map.infoWindow.show(screenPoint);
        flag == 1 ? SetViewDetailsHeight() : flag == 2 ? SetPermitDataHeight() : null;
        if (extent != "") {
            mapExtent = extent.split(',');
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
            extent = "";
        }
    });
}

//Create table row

function CreateTableRow(trData, displayName, value) {
    var tdDisplayText = document.createElement("td");
    tdDisplayText.innerHTML = displayName;
    dojo['dom-class'].add(tdDisplayText, "tdDisplayField");
    var tdFieldName = document.createElement("td");
    dojo['dom-class'].add(tdFieldName, "tdFieldName");
    if (CheckMailFormat(value)) {
        tdFieldName.innerHTML = "";
        var mail = document.createElement("u");
        mail.style.cursor = "pointer";
        mail.innerHTML = value;
        mail.setAttribute("email", value);
        mail.style.wordBreak = "break-all";
        mail.onclick = function () {
            parent.location = "mailto:" + this.getAttribute("email");
        };
        tdFieldName.appendChild(mail);
    } else if ((dojo.string.substitute(value).match("http:")) || (dojo.string.substitute(value).match("https:"))) {
        tdFieldName.innerHTML = "";
        var link = document.createElement("u");
        link.style.cursor = "pointer";
        link.innerHTML = "More info";
        link.setAttribute("link", value);
        link.style.wordBreak = "break-all";
        link.onclick = function () {
            window.open(this.getAttribute("link"));
        };
        tdFieldName.appendChild(link);
        tdFieldName.style.wordBreak = "break-all";
    } else {
        dojo['dom-class'].add(tdFieldName, "tdBreak");
        tdFieldName.innerHTML = value;
        var word = value.split(" ");
        for (var i = 0; i < word.length; i++) {
            wordWidth = GetWidth(word[i], 15) - 50;
            var boxWidth = (isMobileDevice) ? (dojo.window.getBox().w - 10) : (responseObject.InfoPopupWidth - 40);
            if (boxWidth < wordWidth) {
                tdFieldName.className = "tdBreakWord";
                continue;
            }
        }
    }
    trData.appendChild(tdDisplayText);
    trData.appendChild(tdFieldName);
}

//Function to get width of a control when text and font size are specified

function GetWidth(word, fontSize) {
    var test = document.createElement("span");
    document.body.appendChild(test);
    test.style.visibility = "hidden";
    test.style.fontSize = fontSize + "px";
    test.innerHTML = word;
    var w = test.offsetWidth;
    document.body.removeChild(test);
    return w;
}

//Validate Email in InfoWindow

function CheckMailFormat(emailValue) {
    var pattern = /^([a-zA-Z][a-zA-Z0-9\_\-\.]*\@[a-zA-Z0-9\-]*\.[a-zA-Z]{2,4})?$/i
    if (pattern.test(emailValue)) {
        return true;
    } else {
        return false;
    }
}

//Handle orientation change event

function OrientationChanged() {
    if (map) {
        orientationChange = true;
        var timeout = (isMobileDevice && isiOS) ? 100 : 500;
        map.infoWindow.hide();
        setTimeout(function () {
            if (isMobileDevice) {
                map.reposition();
                map.resize();
                SetAddressResultsHeight();
                SetSplashScreenHeight();
                setTimeout(function () {
                    SetViewDetailsHeight();
                    SetPermitDataHeight();
                    if (selectedMapPoint) {
                        map.setExtent(CalculateMapExtent(selectedMapPoint), true);
                    }
                    orientationChange = false;
                }, 500);
            } else {
                setTimeout(function () {
                    if (selectedMapPoint) {
                        map.setExtent(CalculateMapExtent(selectedMapPoint), true);
                    }
                    orientationChange = false;
                }, 500);
            }
        }, timeout);
    }
}

//Reset MapTip position on window resize/orientation change

function SetMapTipPosition() {
    if (!orientationChange) {
        if (selectedMapPoint) {
            var screenPoint = map.toScreen(selectedMapPoint);
            if (isMobileDevice) {
                screenPoint.y = dojo.window.getBox().h - screenPoint.y;
            } else {
                screenPoint.y = map.height - screenPoint.y;
            }
            map.infoWindow.setLocation(screenPoint);
            return;
        }
    }
}

//Hide splash screen container

function HideSplashScreenMessage() {
    if (dojo.isIE < 9) {
        dojo.dom.byId("divSplashScreenContent").style.display = "none";
        dojo['dom-class'].add('divSplashScreenContainer', "opacityHideAnimation");
    } else {
        dojo['dom-class'].add('divSplashScreenContainer', "opacityHideAnimation");
        dojo['dom-class'].replace("divSplashScreenContent", "hideContainer", "showContainer");
    }
}

//Set height for splash screen

function SetSplashScreenHeight() {
    var height = isMobileDevice ? (dojo.window.getBox().h - 110) : (dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divSplashScreenContent')).h - 80);
    dojo.dom.byId('divSplashContent').style.height = (height + 14) + "px";
    CreateScrollbar(dojo.dom.byId("divSplashContainer"), dojo.dom.byId("divSplashContent"));
}

//Handle resize event

function ResizeHandler() {
    if (map) {
        map.reposition();
        map.resize();
    }
}

//Show address container

function ShowLocateContainer() {
    dojo.byId("txtAddress").blur();

    if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
        HideShareAppContainer();
    }
    if (dojo['dom-geometry'].getMarginBox("divLayerContainer").h > 0) {
        HideBaseMapLayerContainer();
    }
    if (isMobileDevice) {
        dojo.dom.byId("divAddressContainer").style.display = "block";
        dojo['dom-class'].replace("divAddressContent", "hideContainerHeight", "showContainerHeight");
    } else {
        if (dojo['dom-geometry'].getMarginBox("divAddressContent").h > 0) {
            dojo['dom-class'].replace("divAddressContent", "hideContainerHeight", "showContainerHeight");
            dojo.dom.byId("divAddressContent").style.height = "0px";
            dojo.dom.byId("txtAddress").blur();
        } else {
            dojo.dom.byId("txtAddress").style.color = "gray";
            dojo.dom.byId("divAddressContent").style.height = "310px";
            dojo['dom-class'].replace("divAddressContent", "showContainerHeight", "hideContainerHeight");
            dojo.dom.byId("txtAddress").style.verticalAlign = "middle";

            if (dojo.dom.byId("tdSearchLocation").className == "tdSearchByLocation") {
                if (dojo.dom.byId("divBreadCrumbs").style.display == "block") {
                    dojo.dom.byId("txtAddress").value = "";
                } else {
                    dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultLocation");
                }
            } else if (dojo.dom.byId("tdSearchPermit").className == "tdSearchByPermit") {
                dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultPermit");
            } else {
                dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultAddress");
            }
            lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
        }
    }
    SetAddressResultsHeight();
}

//Hide address container

function HideAddressContainer() {
    dojo.dom.byId("txtAddress").blur();
    if (isMobileDevice) {
        setTimeout(function () {
            dojo.dom.byId('divAddressContainer').style.display = "none";
        }, 500);
        dojo['dom-class'].replace("divAddressContent", "hideContainerHeight", "showContainerHeight");
    } else {
        dojo['dom-class'].replace("divAddressContent", "hideContainerHeight", "showContainerHeight");
        dojo.dom.byId('divAddressContent').style.height = '0px';
    }
}

//Set height and create scrollbar for address results

function SetAddressResultsHeight() {
    var height = isMobileDevice ? (dojo.window.getBox().h - 50) : dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divAddressContent')).h;
    if (height > 0) {
        if (dojo.dom.byId('divBreadCrumbs').style.display == "block") {
            var heightBreadCrumbs = dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divBreadCrumbs')).h;
            if (isMobileDevice) {
                dojo.dom.byId('divAddressScrollContent').style.height = ((height - 126) - heightBreadCrumbs) + "px";
            } else if (isTablet) {
                dojo.dom.byId('divAddressScrollContent').style.height = ((height - 175) - heightBreadCrumbs) + "px";
            } else {
                dojo.dom.byId('divAddressScrollContent').style.height = ((height - 162) - heightBreadCrumbs) + "px";
            }
        } else {
            if (isMobileDevice) {
                dojo.dom.byId('divAddressScrollContent').style.height = ((height - 126)) + "px";
            } else if (isTablet) {
                dojo.dom.byId('divAddressScrollContent').style.height = ((height - 175)) + "px";
            } else {
                dojo.dom.byId('divAddressScrollContent').style.height = ((height - 152)) + "px";
            }
        }

        if (isMobileDevice) {
            var searchTabWidth = ((dojo.window.getBox().w - 100) / 3) + "px";
            dojo.dom.byId("tdSearchAddress").style.width = searchTabWidth;
            dojo.dom.byId("tdSearchLocation").style.width = searchTabWidth;
            dojo.dom.byId("tdSearchPermit").style.width = searchTabWidth;
            dojo.dom.byId("divAddressPlaceHolder").style.width = (dojo.window.getBox().w - 30) + "px";
            dojo.dom.byId("tdBreadCrumbs").style.width = (dojo.window.getBox().w - 40) + "px";
        } else {
            if (dojo.isIE) {
                dojo.dom.byId("tdBreadCrumbs").style.width = dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divAddressPlaceHolder')).w - 20 + "px";
            } else {
                dojo.dom.byId("tdBreadCrumbs").style.width = dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divAddressPlaceHolder')).w - 10 + "px";
            }
        }
    }
    CreateScrollbar(dojo.dom.byId("divAddressScrollContainer"), dojo.dom.byId("divAddressScrollContent"));
}

//Hide InfoWindow container

function HideInfoContainer() {
    selectedMapPoint = featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = point = null;
    map.infoWindow.hide();
    if (isMobileDevice) {
        setTimeout(function () {
            dojo.dom.byId('divInfoContainer').style.display = "none";
            dojo['dom-class'].replace("divInfoContent", "hideContainer", "showContainer");
        }, 500);
    } else {
        dojo.dom.byId('divInfoContent').style.display = "none";
        dojo.dom.byId("divInfoDetails").style.display = "none";
    }
}

//Set height for InfoWindow container

function SetViewDetailsHeight() {
    var height = isMobileDevice ? (dojo.window.getBox().h) : dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divInfoContent')).h;
    if (height > 0) {
        dojo.dom.byId('divInfoDetailsScroll').style.height = (height - ((!isTablet) ? 63 : 55)) + "px";
    }
    CreateScrollbar(dojo.dom.byId("divInfoDetails"), dojo.dom.byId("divInfoDetailsScroll"));
}

//Set height for InfoWindow container for overlapping permits

function SetPermitDataHeight() {
    var height = isMobileDevice ? dojo.window.getBox().h : dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divInfoContent')).h;
    if (height > 0) {
        dojo.dom.byId('divPermitScrollContent').style.height = (height - ((!isTablet) ? 62 : 55)) + "px";
    }
    CreateScrollbar(dojo.dom.byId("divPermitDataScrollContainer"), dojo.dom.byId("divPermitScrollContent"));
}

//Get the extent based on the map point

function CalculateMapExtent(mapPoint) {
    var width = map.extent.getWidth();
    var height = map.extent.getHeight();
    var xmin = mapPoint.x - (width / 2);
    if (!isMobileDevice) {
        var ymin = mapPoint.y - (height / 3);
    } else {
        var ymin = mapPoint.y - (height / 4);
    }
    var xmax = xmin + width;
    var ymax = ymin + height;
    return new esri.geometry.Extent(xmin, ymin, xmax, ymax, map.spatialReference);
}

//Hide the base map container

function HideBaseMapLayerContainer() {
    dojo['dom-class'].replace("divLayerContainer", "hideContainerHeight", "showContainerHeight");
    dojo.dom.byId('divLayerContainer').style.height = '0px';
}

//Hide the share app container

function HideShareAppContainer() {
    dojo['dom-class'].replace("divAppContainer", "hideContainerHeight", "showContainerHeight");
    dojo.dom.byId('divAppContainer').style.height = '0px';
}

//Create the tiny URL with current extent and selected feature

function ShareLink(ext) {
    tinyUrl = null;
    var mapExtent = GetMapExtent();
    if (currentExtent) {
        var currentMapExtent = Math.round(currentExtent.xmin) + "," + Math.round(currentExtent.ymin) + "," + Math.round(currentExtent.xmax) + "," + Math.round(currentExtent.ymax);
    }
    var url = esri.urlToObject(window.location.toString());

    if (point && !infoWindowLayerID && !searchInfoWindowLayerID) {
        var urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$point=" + point.x + "," + point.y + "$currentExtent=" + currentMapExtent;
    } else if (point && infoWindowLayerID && !addressSearchFlag) {
        var urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$point=" + point.x + "," + point.y + "$currentExtent=" + currentMapExtent + "$featureID=" + featureID + "$infoWindowLayerID=" + infoWindowLayerID;
    } else if (searchFeatureID && searchInfoWindowLayerID && addressSearchFlag) {
        var urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$searchFeatureID=" + searchFeatureID + "$searchInfoWindowLayerID=" + searchInfoWindowLayerID;
    } else {
        var urlStr = encodeURI(url.path) + "?extent=" + mapExtent;
    }

    url = dojo.string.substitute(responseObject.MapSharingOptions.TinyURLServiceURL, [urlStr]);
    esri.request({
        url: url,
        callbackParamName: "callback",
        timeout: 6000,
        load: function (data) {
            tinyResponse = data;
            tinyUrl = data;
            var attr = responseObject.MapSharingOptions.TinyURLResponseAttribute.split(".");
            for (var x = 0; x < attr.length; x++) {
                tinyUrl = tinyUrl[attr[x]];
            }
            if (!tinyUrl) {
                tinyUrl = urlStr;
            }
            if (ext) {
                HideBaseMapLayerContainer();
                HideAddressContainer();
                var cellHeight = (isMobileDevice || isTablet) ? 81 : 60;
                if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
                    HideShareAppContainer();
                } else {
                    dojo.dom.byId('divAppContainer').style.height = cellHeight + "px";
                    dojo['dom-class'].replace("divAppContainer", "showContainerHeight", "hideContainerHeight");
                }
            }
        },
        error: function () {
            if (!tinyResponse) {
                tinyUrl = urlStr;
            } else {
                tinyUrl = urlStr;
            }
        }
    });
}

//Open login page for facebook,tweet and open Email client with shared link for Email

function Share(site) {
    if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
        dojo['dom-class'].replace("divAppContainer", "hideContainerHeight", "showContainerHeight");
        dojo.dom.byId('divAppContainer').style.height = '0px';
    }
    if (tinyUrl) {
        switch (site) {
            case "facebook":
                window.open(dojo.string.substitute(responseObject.MapSharingOptions.FacebookShareURL, [tinyUrl]));
                break;
            case "twitter":
                window.open(dojo.string.substitute(responseObject.MapSharingOptions.TwitterShareURL, [tinyUrl]));
                break;
            case "mail":
                parent.location = dojo.string.substitute(responseObject.MapSharingOptions.ShareByMailLink, [tinyUrl]);
                break;
        }
    } else {
        alert(messages.getElementsByTagName("tinyURLEngine")[0].childNodes[0].nodeValue);
    }
}

//Get current map Extent

function GetMapExtent() {
    var extents = Math.round(map.extent.xmin).toString() + "," + Math.round(map.extent.ymin).toString() + "," +
        Math.round(map.extent.xmax).toString() + "," + Math.round(map.extent.ymax).toString();
    return (extents);
}

//Get the query string value of the provided key

function GetQueryString(key) {
    var _default;
    if (!_default) {
        _default = "";
    }
    key = key.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
    var qs = regex.exec(window.location.href);
    if (!qs) {
        return _default;
    } else {
        return qs[1];
    }
}

//Show progress indicator

function ShowProgressIndicator() {
    dojo.dom.byId('divLoadingIndicator').style.display = "block";
}

//Hide progress indicator

function HideProgressIndicator() {
    dojo.dom.byId('divLoadingIndicator').style.display = "none";
}

//Show a transparent container above the search list while the search is still being performed

function ShowTransparentContainer() {
    dojo.dom.byId('divTransparentContainer').style.top = dojo['dom-geometry'].getMarginBox("divAddressContent").t + dojo['dom-geometry'].getMarginBox("tblAddressHeader").h + "px";
    dojo.dom.byId('divTransparentContainer').style.height = dojo['dom-geometry'].getMarginBox("divAddressResultContainer").h + "px";
    dojo.dom.byId('divTransparentContainer').style.display = "block";
}

//Hide the transparent container shown above the search list while the search is still being performed

function HideTransparentContainer() {
    dojo.dom.byId('divTransparentContainer').style.display = "none";
}

//Clear default value

function ClearDefaultText(e) {
    var target = window.event ? window.event.srcElement : e ? e.target : null;
    if (!target) return;
    target.style.color = "#FFF";
    target.value = '';
}

//Set default value

function ReplaceDefaultText(e) {
    var target = window.event ? window.event.srcElement : e ? e.target : null;
    if (!target) return;

    if (dojo.dom.byId("tdSearchLocation").className == "tdSearchByLocation") {
        ResetTargetValue(target, "defaultLocation", "gray");
    } else if (dojo.dom.byId("tdSearchPermit").className == "tdSearchByPermit") {
        ResetTargetValue(target, "defaultPermit", "gray");
    } else {
        ResetTargetValue(target, "defaultAddress", "gray");
    }
}

//Set changed value for address/location/permit

function ResetTargetValue(target, title, color) {
    if (target.value == '' && target.getAttribute(title)) {
        target.value = target.title;
        if (target.title == "") {
            target.value = target.getAttribute(title);
        }
    }
    target.style.color = color;
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
}

//Display the view to search by address

function ShowAddressSearchView() {
    if (dojo.dom.byId("imgSearchLoader").style.display == "block") {
        return;
    }
    dojo.dom.byId("divBreadCrumbs").style.display = "none";
    dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultAddress");
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("tdSearchAddress").className = "tdSearchByAddress";
    dojo.dom.byId("tdSearchLocation").className = "tdSearchByUnSelectedLocation";
    dojo.dom.byId("tdSearchPermit").className = "tdSearchByUnSelectedPermit";
}

//Display the view to search by location

function ShowLocationSearchView() {
    if (dojo.string.trim(dojo.dom.byId("tdBreadCrumbs").innerHTML) == "") {
        dojo.dom.byId("divBreadCrumbs").style.display = "none";
        dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultLocation");
    } else {
        ClearBreadCrumbs();
        dojo.dom.byId("txtAddress").value = "";
    }
    if (dojo.dom.byId("imgSearchLoader").style.display == "block") {
        return;
    }
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("tdSearchAddress").className = "tdSearchByUnSelectedAddress";
    dojo.dom.byId("tdSearchLocation").className = "tdSearchByLocation";
    dojo.dom.byId("tdSearchPermit").className = "tdSearchByUnSelectedPermit";
}

//Display the view to search by permit

function ShowPermitSearchView() {
    if (dojo.dom.byId("imgSearchLoader").style.display == "block") {
        return;
    }
    dojo.dom.byId("divBreadCrumbs").style.display = "none";
    dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultPermit");
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("tdSearchAddress").className = "tdSearchByUnSelectedAddress";
    dojo.dom.byId("tdSearchLocation").className = "tdSearchByUnSelectedLocation";
    dojo.dom.byId("tdSearchPermit").className = "tdSearchByPermit";
}

//Create map services based on the LoadAsServiceType value coming from the config file

function AddServiceLayers(layerId, layerURL, layerType) {
    switch ((layerType).toLowerCase()) {
        case "dynamic":
            var imageParams = new esri.layers.ImageParameters();
            var lastIndex = layerURL.lastIndexOf('/');
            var dynamicLayerId = layerURL.substr(lastIndex + 1);
            if (isNaN(dynamicLayerId) || dynamicLayerId == "") {
                if (isNaN(dynamicLayerId)) {
                    var dynamicLayer = layerURL + "/";
                } else if (dynamicLayerId == "") {
                    var dynamicLayer = layerURL;
                }
                var layertype = dynamicLayer.substring(((dynamicLayer.lastIndexOf("/")) + 1), (dynamicLayer.length));
                if (layerURL.indexOf("/FeatureServer") >= 0) {
                    AddHostedServices(dynamicLayer, layerId);
                } else {
                    CreateDynamicServiceLayer(dynamicLayer, imageParams, layerId);
                }
            } else {
                imageParams.layerIds = [dynamicLayerId];
                imageParams.layerOption = esri.layers.ImageParameters.LAYER_OPTION_SHOW;
                var dynamicLayer = layerURL.substring(0, lastIndex);
                var layertype = dynamicLayer.substring(((dynamicLayer.lastIndexOf("/")) + 1), (dynamicLayer.length));
                if (layerURL.indexOf("/FeatureServer") >= 0) {
                    AddHostedServices(dynamicLayer, layerId);
                } else {
                    CreateDynamicServiceLayer(dynamicLayer, imageParams, layerId);
                }
            }
            break;
        case "tiled":
            CreateTiledServiceLayer(layerId, layerURL);
            break;
        case "feature":
            CreateFeatureServiceLayer(layerId, layerURL);
            break;
        default:
            alert(dojo.string.substitute(messages.getElementsByTagName("invalidServiceType")[0].childNodes[0].nodeValue, [layerType]));
    }
}

//Add hosted services to the map

function AddHostedServices(layerURL, layerId) {
    esri.request({
        url: layerURL + "?f=json",
        load: function (data) {
            for (var p = 0; p < data.layers.length; p++) {
                var lyr = layerURL + data.layers[p].id;
                CreateFeatureServiceLayer(layerId + p, lyr);
            }
        },
        error: function (err) {
            alert(err.message);
        }
    });
}

//Create dynamic services

function CreateDynamicServiceLayer(dynamicLayer, imageParams, layerId) {
    var dynamicMapService = new esri.layers.ArcGISDynamicMapServiceLayer(dynamicLayer, {
        imageParameters: imageParams,
        id: layerId,
        visible: true
    });
    dynamicMapService.setImageFormat("png32");
    dojo.connect(dynamicMapService, "onError", function (err) {
        alert(messages.getElementsByTagName("layerLoadError")[0].childNodes[0].nodeValue + " " + err.message);
    });
    map.addLayer(dynamicMapService);
}

//Create feature services

function CreateFeatureServiceLayer(layerId, layerURL) {
    var featureLayer = new esri.layers.FeatureLayer(layerURL, {
        mode: esri.layers.FeatureLayer.MODE_SNAPSHOT,
        id: layerId,
        outFields: ["*"]
    });
    dojo.connect(featureLayer, "onError", function (err) {
        alert(messages.getElementsByTagName("layerLoadError")[0].childNodes[0].nodeValue + " " + err.message);
    });
    map.addLayer(featureLayer);
}

//Create tiled services

function CreateTiledServiceLayer(layerId, layerURL) {
    var lastIndex = layerURL.lastIndexOf('/');
    var layer = layerURL.substring(0, lastIndex);
    var layertype = layer.substring(((layer.lastIndexOf("/")) + 1), (layer.length));
    var dynamicLayerId = layerURL.substr(lastIndex + 1);
    if (isNaN(dynamicLayerId) || dynamicLayerId == "") {
        if (layerURL.indexOf("/FeatureServer") >= 0) {
            if (isNaN(dynamicLayerId)) {
                AddHostedServices(layerURL + "/", layerId);
            } else if (dynamicLayerId == "") {
                AddHostedServices(layerURL, layerId);
            }
        } else {
            var tiledLayer = new esri.layers.ArcGISTiledMapServiceLayer(layerURL, {
                id: layerId
            });
        }
    } else {
        if (layerURL.indexOf("/FeatureServer") >= 0) {
            AddHostedServices(layerURL, layerId);
        } else {
            var tiledLayer = new esri.layers.ArcGISTiledMapServiceLayer(layer, {
                id: layerId
            });
        }
    }

    dojo.connect(tiledLayer, "onError", function (err) {
        if (tiledLayer.tileInfo && tiledLayer.tileInfo.lods.length == 0) {
            alert(dojo.string.substitute(messages.getElementsByTagName("noLODs")[0].childNodes[0].nodeValue, [tiledLayer.id]));
        } else {
            alert(messages.getElementsByTagName("layerLoadError")[0].childNodes[0].nodeValue + " " + err.message);
        }
    });
    map.addLayer(tiledLayer);
}

//Create scroll-bar

function CreateScrollbar(container, content) {
    var yMax;
    var pxLeft, pxTop, xCoord, yCoord;
    var scrollbar_track;
    var isHandleClicked = false;
    this.container = container;
    this.content = content;
    content.scrollTop = 0;
    if (dojo.byId(container.id + 'scrollbar_track')) {
        dojo['dom-construct'].empty(dojo.byId(container.id + 'scrollbar_track'));
        container.removeChild(dojo.byId(container.id + 'scrollbar_track'));
    }
    if (!dojo.byId(container.id + 'scrollbar_track')) {
        scrollbar_track = document.createElement('div');
        scrollbar_track.id = container.id + "scrollbar_track";
        scrollbar_track.className = "scrollbar_track";
    } else {
        scrollbar_track = dojo.byId(container.id + 'scrollbar_track');
    }
    var containerHeight = dojo.coords(container);
    scrollbar_track.style.right = 5 + 'px';
    var scrollbar_handle = document.createElement('div');
    scrollbar_handle.className = 'scrollbar_handle';
    scrollbar_handle.id = container.id + "scrollbar_handle";
    scrollbar_track.appendChild(scrollbar_handle);
    container.appendChild(scrollbar_track);
    if ((content.scrollHeight - content.offsetHeight) <= 5) {
        scrollbar_handle.style.display = 'none';
        scrollbar_track.style.display = 'none';
        return;
    } else {
        scrollbar_handle.style.display = 'block';
        scrollbar_track.style.display = 'block';
        scrollbar_handle.style.height = Math.max(this.content.offsetHeight * (this.content.offsetHeight / this.content.scrollHeight), 25) + 'px';
        yMax = this.content.offsetHeight - scrollbar_handle.offsetHeight;
        yMax = yMax - 5; //for getting rounded bottom of handle
        if (window.addEventListener) {
            content.addEventListener('DOMMouseScroll', ScrollDiv, false);
        }
        content.onmousewheel = function (evt) {
            console.log(content.id);
            ScrollDiv(evt);
        }
    }

    function ScrollDiv(evt) {
        var evt = window.event || evt //equalize event object
        var delta = evt.detail ? evt.detail * (-120) : evt.wheelDelta //delta returns +120 when wheel is scrolled up, -120 when scrolled down
        pxTop = scrollbar_handle.offsetTop;

        if (delta <= -120) {
            var y = pxTop + 10;
            if (y > yMax) {
                y = yMax
            } // Limit vertical movement
            if (y < 0) {
                y = 0
            } // Limit vertical movement
            scrollbar_handle.style.top = y + "px";
            content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));

        } else {
            var y = pxTop - 10;
            if (y > yMax) {
                y = yMax
            } // Limit vertical movement
            if (y < 0) {
                y = 2
            } // Limit vertical movement
            scrollbar_handle.style.top = (y - 2) + "px";
            content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));
        }
    }

    //Attach events to scrollbar components
    scrollbar_track.onclick = function (evt) {
        if (!isHandleClicked) {
            evt = (evt) ? evt : event;
            pxTop = scrollbar_handle.offsetTop // Sliders vertical position at start of slide.
            var offsetY;
            if (!evt.offsetY) {
                var coords = dojo.coords(evt.target);
                offsetY = evt.layerY - coords.t;
            } else offsetY = evt.offsetY;
            if (offsetY < scrollbar_handle.offsetTop) {
                scrollbar_handle.style.top = offsetY + "px";
                content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));
            } else if (offsetY > (scrollbar_handle.offsetTop + scrollbar_handle.clientHeight)) {
                var y = offsetY - scrollbar_handle.clientHeight;
                if (y > yMax) y = yMax // Limit vertical movement
                if (y < 0) y = 0 // Limit vertical movement
                scrollbar_handle.style.top = y + "px";
                content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));
            } else {
                return;
            }
        }
        isHandleClicked = false;
    };

    //Attach events to scrollbar components
    scrollbar_handle.onmousedown = function (evt) {
        isHandleClicked = true;
        evt = (evt) ? evt : event;
        evt.cancelBubble = true;
        if (evt.stopPropagation) evt.stopPropagation();
        pxTop = scrollbar_handle.offsetTop // Sliders vertical position at start of slide.
        yCoord = evt.screenY // Vertical mouse position at start of slide.
        document.body.style.MozUserSelect = 'none';
        document.body.style.userSelect = 'none';
        document.onselectstart = function () {
            return false;
        }
        document.onmousemove = function (evt) {
            evt = (evt) ? evt : event;
            evt.cancelBubble = true;
            if (evt.stopPropagation) evt.stopPropagation();
            var y = pxTop + evt.screenY - yCoord;
            if (y > yMax) {
                y = yMax
            } // Limit vertical movement
            if (y < 0) {
                y = 0
            } // Limit vertical movement
            scrollbar_handle.style.top = y + "px";
            content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));
        }
    };

    document.onmouseup = function () {
        document.body.onselectstart = null;
        document.onmousemove = null;
    };

    scrollbar_handle.onmouseout = function (evt) {
        document.body.onselectstart = null;
    };

    var startPos;
    var scrollingTimer;

    dojo.connect(container, "touchstart", function (evt) {
        touchStartHandler(evt);
    });

    dojo.connect(container, "touchmove", function (evt) {
        touchMoveHandler(evt);
    });

    dojo.connect(container, "touchend", function (evt) {
        touchEndHandler(evt);
    });

    //Handlers for Touch Events

    function touchStartHandler(e) {
        startPos = e.touches[0].pageY;
    }

    function touchMoveHandler(e) {
        var touch = e.touches[0];
        e.cancelBubble = true;
        if (e.stopPropagation) e.stopPropagation();
        e.preventDefault();

        pxTop = scrollbar_handle.offsetTop;
        var y;
        if (startPos > touch.pageY) {
            y = pxTop + 10;
        } else {
            y = pxTop - 10;
        }

        //set scrollbar handle
        if (y > yMax) y = yMax // Limit vertical movement
        if (y < 0) y = 0 // Limit vertical movement
        scrollbar_handle.style.top = y + "px";

        //set content position
        content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));

        scrolling = true;
        startPos = touch.pageY;
    }

    function touchEndHandler(e) {
        scrollingTimer = setTimeout(function () {
            clearTimeout(scrollingTimer);
            scrolling = false;
        }, 100);
    }
    //touch scrollbar end
}