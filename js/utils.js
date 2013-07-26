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
var tinyResponse; //variable for storing the response from tiny URL api
var tinyUrl; //variable for storing the tiny URL
var counter;
var layerCount = 0;
var layerArray = [];
var featureArray = [];
var point = null;
var currentExtent;

//Remove scroll bar
function RemoveScrollBar(container) {
    if (dojo.byId(container.id + 'scrollbar_track')) {
        container.removeChild(dojo.byId(container.id + 'scrollbar_track'));
    }
}

//Clear graphics on map
function ClearGraphics() {
    if (map.getLayer(tempGraphicsLayerId)) {
        map.getLayer(tempGraphicsLayerId).clear();
    }
}

//Function to append ... for a long string
String.prototype.trimString = function (len) {
    return (this.length > len) ? this.substring(0, len) + "..." : this;
}

//Trim string
String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
}

//Get MaxOffSet
function MaxOffSet() {
    return Math.floor(map.extent.getWidth() / map.width);
}

//Get extent from point to query the layer
function ExtentFromPoint(point) {
    var tolerance = (isMobileDevice) ? 8 : 5;
    var screenPoint = map.toScreen(point);
    var pnt1 = new esri.geometry.Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
    var pnt2 = new esri.geometry.Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
    var mapPoint1 = map.toMap(pnt1);
    var mapPoint2 = map.toMap(pnt2);
    return new esri.geometry.Extent(mapPoint1.x, mapPoint1.y, mapPoint2.x, mapPoint2.y, map.spatialReference);
}

function FindPermits(mapPoint) {
    featureArray = [];
    layerArray = [];
    counter = 0;

    for (var index in permitResultData) {
        layerArray.push({
            data: permitResultData[index],
            index: index
        });
    }
    FetchPermitData(mapPoint);
}

function FetchPermitData(mapPoint) {
    if (layerCount < layerArray.length) {
        ExecuteQueryTask(layerArray[layerCount], mapPoint);
    } else {
        layerCount = 0;
    }
}

//Perform querytask on map layer
function ExecuteQueryTask(layer, mapPoint) {
    var queryTask = new esri.tasks.QueryTask(layer.data.ServiceURL);
    var query = new esri.tasks.Query();
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.geometry = ExtentFromPoint(mapPoint);
    query.outFields = ["*"];
    query.maxAllowableOffset = MaxOffSet();
    queryTask.execute(query, function (result) {
        counter++;
        if (result.features.length > 0) {
            for (var i = 0; i < result.features.length; i++) {
                featureArray.push({
                    attr: result.features[i],
                    index: layer.index,
                    layerId: layer.data,
                    fields: result.fields
                });
            }
        }
        if (counter == layerArray.length) {
            if (featureArray.length > 0) {
                if (!isMobileDevice) {
                    if (featureArray.length == 1) {
                        var feature = featureArray[0].attr.attributes;

                        dojo.byId("tdList").style.display = "none";
                        permitResultData[layerCount];
                        ShowInfoWindowDetails(featureArray[0].attr.geometry, feature, featureArray.length, featureArray[0].layerId, mapPoint, featureArray[0].fields);
                    } else {
                        ShowPermitList(mapPoint, featureArray, featureArray[0].attr.geometry);
                        dojo.byId("tdList").onclick = function () {
                            featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = sharedFeatureID = sharedLayerID = null;
                            ShowPermitList(mapPoint, featureArray, featureArray[0].attr.geometry);
                        }
                    }
                } else {
                    HideProgressIndicator();
                    ShowMobileInfoDetails(mapPoint, featureArray, featureArray[0].attr.geometry);
                }
            } else {
                selectedMapPoint = null;
                alert(messages.getElementsByTagName("unableToLocatePermit")[0].childNodes[0].nodeValue);
            }
        }
        layerCount++;
        FetchPermitData(mapPoint);
    });
}

//Display infowindow for mobile device on search
function ShowMobileInfoWindow(mapPoint, attributes, layerID, fields) {
    ClearGraphics();
    map.infoWindow.setTitle("");
    map.infoWindow.setContent("");
    setTimeout(function () {
        var screenPoint;
        selectedMapPoint = mapPoint;
        point = mapPoint;
        currentExtent = map.extent;
        map.setExtent(CalculateMapExtent(selectedMapPoint));
        screenPoint = map.toScreen(mapPoint);
        screenPoint.y = map.height - screenPoint.y;
        map.infoWindow.resize(225, 65);
        map.infoWindow.show(screenPoint);
        if (extent != "") {
            mapExtent = extent.split(',');
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
            extent = "";
        }
        for (var i in attributes) {
            if (!attributes[i]) {
                attributes[i] = showNullValueAs;
            }
        }
        map.infoWindow.setTitle(dojo.string.substitute(layerID.InfoWindowHeader, attributes).trimString(15));
        map.infoWindow.setContent(dojo.string.substitute(layerID.InfoWindowContent, attributes));

        dojo.connect(map.infoWindow.imgDetailsInstance(), "onclick", function () {
            var feature = attributes;
            dojo.byId("tdList").style.display = "none";
            ShowInfoWindowDetails(mapPoint, feature, null, layerID, null, fields);
        });
    });
}

//Display infowindow for mobile device on map click
function ShowMobileInfoDetails(mapPoint, featureArray, geometry) {
    map.infoWindow.setTitle("");
    map.infoWindow.setContent("");
    setTimeout(function () {
        ClearGraphics();
        var screenPoint;
        selectedMapPoint = GetGeometryType(mapPoint, geometry);
        point = mapPoint;
        currentExtent = map.extent;
        map.setExtent(CalculateMapExtent(selectedMapPoint));
        screenPoint = map.toScreen(mapPoint);
        screenPoint.y = map.height - screenPoint.y;
        map.infoWindow.resize(225, 65);
        map.infoWindow.show(screenPoint);
        if (extent != "") {
            mapExtent = extent.split(',');
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
            extent = "";
        }
        if (featureArray.length == 1) {
            for (var i in featureArray[0].attr.attributes) {
                if (!featureArray[0].attr.attributes[i]) {
                    featureArray[0].attr.attributes[i] = showNullValueAs;
                }
            }

            map.infoWindow.setTitle(dojo.string.substitute(featureArray[0].layerId.InfoWindowHeader, featureArray[0].attr.attributes).trimString(15));
            map.infoWindow.setContent(dojo.string.substitute(featureArray[0].layerId.InfoWindowContent, featureArray[0].attr.attributes));
        } else {
            map.infoWindow.setTitle(dojo.string.substitute(featureArray.length + " Features found"));
        }
        dojo.connect(map.infoWindow.imgDetailsInstance(), "onclick", function () {
            if (featureArray.length == 1) {
                var feature = featureArray[0].attr.attributes;
                dojo.byId("tdList").style.display = "none";
                ShowInfoWindowDetails(mapPoint, feature, featureArray.length, featureArray[0].layerId, null, featureArray[0].fields);
            } else {
                ShowPermitList(featureArray[0].attr.geometry, featureArray);
                dojo.byId("tdList").onclick = function () {
                    ShowPermitList(featureArray[0].attr.geometry, featureArray);
                }
            }
        });
    });
}

//Display list of permits in infoWindow on map click
function ShowPermitList(mapPoint, result, geometry) {
    ClearGraphics();
    dojo.byId("divPermitDataScrollContainer").style.display = "block";
    dojo.byId("tdList").style.display = "none";
    dojo.byId("divInfoDetails").style.display = "none";
    dojo.empty(dojo.byId("divPermitScrollContent"));
    var table = document.createElement("table");
    dojo.byId("divPermitScrollContent").appendChild(table);
    table.style.width = "100%";
    table.style.textAlign = "left";
    table.style.overflow = "hidden";
    var tBody = document.createElement("tbody");
    table.appendChild(tBody);

    for (var i = 0; i < result.length; i++) {
        var tr = document.createElement("tr");
        tr.className = "trRowHeight";
        tr.id = featureArray[i].attr.attributes[shareQuery.split("${0}")[0].split(" =")[0]];
        tBody.appendChild(tr);
        var td = document.createElement("td");
        td.className = "cursorPointer";
        var permitText = result[i].layerId.ListDisplayText;
        td.innerHTML = permitText;
        var td1 = document.createElement("td");
        td1.className = "cursorPointer";
        var permitValue = dojo.string.substitute(result[i].layerId.ListFieldName, result[i].attr.attributes);
        td1.innerHTML = permitValue;
        if (featureArray[i].attr.attributes[shareQuery.split("${0}")[0].split(" =")[0]] == sharedFeatureID) {
            var index = i;
        }
        tr.onclick = function (e) {
            featureID = this.id;
            infoWindowLayerID = featureArray[this.rowIndex].index;
            ShowInfoWindowDetails(featureArray[this.rowIndex].attr.geometry, featureArray[this.rowIndex].attr.attributes, featureArray.length, featureArray[this.rowIndex].layerId, mapPoint, featureArray[this.rowIndex].fields);
        }
        tr.appendChild(td);
        tr.appendChild(td1);
        HideProgressIndicator();
    }

    if (!isMobileDevice) {
        dojo.byId('divInfoContent').style.display = "block";
        dojo.byId('divInfoContent').style.width = infoPopupWidth + "px";
        dojo.byId('divInfoContent').style.height = infoPopupHeight + "px";
        map.infoWindow.resize(infoPopupWidth, infoPopupHeight);
        selectedMapPoint = GetGeometryType(mapPoint, geometry);
        point = mapPoint;
        currentExtent = map.extent;
        map.setExtent(CalculateMapExtent(selectedMapPoint));
        var screenPoint = map.toScreen(selectedMapPoint);
        screenPoint.y = map.height - screenPoint.y;
        map.infoWindow.show(screenPoint);
        dojo.byId('tdInfoHeader').innerHTML = result.length + " Features found at this location.";
        SetPermitDataHeight();
        if (extent != "") {
            mapExtent = extent.split(',');
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
            extent = "";
        }
    } else {
        dojo.byId('divInfoContainer').style.display = "block";
        dojo.replaceClass("divInfoContainer", "opacityShowAnimation", "opacityHideAnimation");
        dojo.addClass("divInfoContainer", "divInfoContainer");
        dojo.replaceClass("divInfoContent", "showContainer", "hideContainer");
        dojo.addClass("divInfoContent", "divInfoContent");
        dojo.byId('tdInfoHeader').innerHTML = result.length + " Features found";
        SetPermitDataHeight();
    }

    if (sharedFeatureID && sharedLayerID) {
        ShowInfoWindowDetails(mapPoint, featureArray[index].attr.attributes, featureArray.length, featureArray[index].layerId, null, featureArray[index].fields);
    }
}

//Fetch the geometry type of the mapPoint
function GetGeometryType(mapPoint, geometry) {
    if (geometry.type != "polygon") {
        selectedMapPoint = geometry;
    } else {
        if (!geometry.contains(mapPoint)) {
            selectedMapPoint = geometry.getPoint(0, 0);
        } else {
            selectedMapPoint = geometry.getExtent().getCenter();
        }
    }
    return selectedMapPoint;
}

//Display infowindow
function ShowInfoWindowDetails(geometry, attributes, featureLength, layer, mapPoint, fields) {
    ClearGraphics();
    dojo.byId("tdList").style.display = "none";
    dojo.byId("divPermitDataScrollContainer").style.display = "none";
    dojo.empty(dojo.byId("divPermitScrollContent"));
    if (featureLength > 1) {
        dojo.byId("tdList").style.display = "block";
    }
    for (var index in attributes) {
        if (!attributes[index] || attributes[index] == " ") {
            attributes[index] = showNullValueAs;
        }
    }

    value = dojo.string.substitute(layer.InfoWindowHeader, attributes).trim();
    if (isBrowser) {
        value = value.trimString(Math.round(infoPopupWidth / 6));
    } else {
        value = value.trimString(Math.round(infoPopupWidth / 10));
    }

    if (!isMobileDevice) {
        map.infoWindow.hide();
        selectedMapPoint = null;
        dojo.byId('divInfoContent').style.display = "block";
        dojo.byId('divInfoContent').style.width = infoPopupWidth + "px";
        dojo.byId('divInfoContent').style.height = infoPopupHeight + "px";
        dojo.byId("divInfoDetails").style.display = "block";
        map.infoWindow.resize(infoPopupWidth, infoPopupHeight);
        selectedMapPoint = GetGeometryType(mapPoint, geometry);
        point = mapPoint;
        currentExtent = map.extent;
        map.setExtent(CalculateMapExtent(selectedMapPoint));
        var screenPoint = map.toScreen(selectedMapPoint);
        screenPoint.y = map.height - screenPoint.y;
        map.infoWindow.show(screenPoint);
        if (extent != "") {
            mapExtent = extent.split(',');
            mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
            map.setExtent(mapExtent);
            extent = "";
        }
    } else {
        dojo.byId('divInfoContainer').style.display = "block";
        dojo.replaceClass("divInfoContainer", "opacityShowAnimation", "opacityHideAnimation");
        dojo.addClass("divInfoContainer", "divInfoContainer");
        dojo.replaceClass("divInfoContent", "showContainer", "hideContainer");
        dojo.addClass("divInfoContent", "divInfoContent");
        dojo.byId("divInfoDetails").style.display = "block";
    }
    dojo.empty(dojo.byId('tblInfoDetails'));

    dojo.byId('tdInfoHeader').innerHTML = value;
    var tblInfoDetails = dojo.byId('tblInfoDetails');
    var tbody = document.createElement("tbody");
    tblInfoDetails.appendChild(tbody);
    for (var j in fields) {
        if (fields[j].type == "esriFieldTypeDate") {
            if (attributes[fields[j].name]) {
                if (Number(attributes[fields[j].name])) {
                    var date = new js.date();
                    var utcMilliseconds = Number(attributes[fields[j].name]);
                    attributes[fields[j].name] = dojo.date.locale.format(date.utcTimestampFromMs(utcMilliseconds), { datePattern: formatDateAs, selector: "date" });
                }
            }
        }
    }

    var infoWindowData = layer.InfoWindowData;
    for (var index in layer.InfoWindowData) {
        var tr = document.createElement("tr");
        tbody.appendChild(tr);
        CreateTableRow(tr, layer.InfoWindowData[index].DisplayText, dojo.string.substitute(layer.InfoWindowData[index].FieldName, attributes));
    }
    SetViewDetailsHeight();
}

//Create table row
function CreateTableRow(tr, displayName, value) {
    var tdDisplayText = document.createElement("td");
    tdDisplayText.innerHTML = displayName;
    tdDisplayText.className = 'tdDisplayField';
    var tdFieldName = document.createElement("td");
    tdFieldName.style.width = "180px";
    tdFieldName.vAlign = "top";
    tdFieldName.style.paddingTop = "5px";
    tdFieldName.style.paddingLeft = "3px";
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
        tdFieldName.className = "tdBreak";
        tdFieldName.innerHTML = value;
    }
    tr.appendChild(tdDisplayText);
    tr.appendChild(tdFieldName);
}

//Validate Email in infowindow
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
                SetViewDetailsHeight();
                SetPermitDataHeight();
                setTimeout(function () {
                    if (selectedMapPoint) {
                        map.setExtent(CalculateMapExtent(selectedMapPoint));
                    }
                    if (map.getLayer(tempGraphicsLayerId)) {
                        SetPushPinPosition();
                    }
                    orientationChange = false;
                }, 500);

            } else {
                setTimeout(function () {
                    if (selectedMapPoint) {
                        map.setExtent(CalculateMapExtent(selectedMapPoint));
                    }
                    orientationChange = false;
                }, 500);
            }
        }, timeout);
    }
}

//Reset maptip position on window resize/orientation change
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

//Reset pushpin position on window resize/orientation change
function SetPushPinPosition() {
    if (map.getLayer(tempGraphicsLayerId).graphics.length > 0) {
        map.centerAt(map.getLayer(tempGraphicsLayerId).graphics[0].geometry);
    }
}

//Hide splash screen container
function HideSplashScreenMessage() {
    if (dojo.isIE < 9) {
        dojo.byId("divSplashScreenContent").style.display = "none";
        dojo.addClass('divSplashScreenContainer', "opacityHideAnimation");
    } else {
        dojo.addClass('divSplashScreenContainer', "opacityHideAnimation");
        dojo.replaceClass("divSplashScreenContent", "hideContainer", "showContainer");
    }
}

//Set height for splash screen
function SetSplashScreenHeight() {
    var height = (isMobileDevice) ? (dojo.window.getBox().h - 110) : (dojo.coords(dojo.byId('divSplashScreenContent')).h - 80);
    dojo.byId('divSplashContent').style.height = (height + 14) + "px";
    CreateScrollbar(dojo.byId("divSplashContainer"), dojo.byId("divSplashContent"));
}

//Handle resize event
function ResizeHandler() {
    if (map) {
        map.reposition();
        map.resize();
        setTimeout(function () {
            if (map.getLayer(tempGraphicsLayerId)) {
                SetPushPinPosition();
            }
        }, 500);
    }
}

//Show address container
function ShowLocateContainer() {
    dojo.byId("txtAddress").blur();

    if (dojo.coords("divAppContainer").h > 0) {
        dojo.replaceClass("divAppContainer", "hideContainerHeight", "showContainerHeight");
        dojo.byId("divAppContainer").style.height = "0px";
    }
    if (dojo.coords("divLayerContainer").h > 0) {
        dojo.replaceClass("divLayerContainer", "hideContainerHeight", "showContainerHeight");
        dojo.byId("divLayerContainer").style.height = "0px";
    }

    if (dojo.byId("tdSearchLocation").className == "tdSearchByLocation") {
        dojo.byId("txtAddress").value = dojo.byId("txtAddress").getAttribute("defaultLocation");
    } else if (dojo.byId("tdSearchPermit").className == "tdSearchByPermit") {
        dojo.byId("txtAddress").value = dojo.byId("txtAddress").getAttribute("defaultPermit");
    } else {
        dojo.byId("txtAddress").value = dojo.byId("txtAddress").getAttribute("defaultAddress");
    }
    if (isMobileDevice) {
        dojo.byId("divAddressContainer").style.display = "block";
        dojo.replaceClass("divAddressContent", "hideContainerHeight", "showContainerHeight");

    } else {
        if (dojo.coords("divAddressContent").h > 0) {
            dojo.replaceClass("divAddressContent", "hideContainerHeight", "showContainerHeight");
            dojo.byId("divAddressContent").style.height = "0px";
            dojo.byId("txtAddress").blur();
        } else {
            dojo.byId("txtAddress").style.color = "gray";
            dojo.byId("divAddressContent").style.height = "310px";
            dojo.replaceClass("divAddressContent", "showContainerHeight", "hideContainerHeight");
            dojo.byId("txtAddress").style.verticalAlign = "middle";
        }
    }
    if (dojo.byId("tdSearchPermit").className == "tdSearchByPermit") {
        ShowPermitSearchView();
    }
    dojo.empty(dojo.byId("tblAddressResults"));
    ResizeHandler();
    SetAddressResultsHeight();
}

//Hide address container
function HideAddressContainer() {
    dojo.byId("imgSearchLoader").style.display = "none";
    dojo.byId("txtAddress").blur();
    if (isMobileDevice) {
        setTimeout(function () {
            dojo.byId('divAddressContainer').style.display = "none";
        }, 500);
        dojo.replaceClass("divAddressContent", "hideContainerHeight", "showContainerHeight");
    } else {
        dojo.replaceClass("divAddressContent", "hideContainerHeight", "showContainerHeight");
        dojo.byId('divAddressContent').style.height = '0px';
    }
}

//Set height and create scrollbar for address results
function SetAddressResultsHeight() {
    var height = (isMobileDevice) ? (dojo.window.getBox().h - 50) : dojo.coords(dojo.byId('divAddressContent')).h;
    if (height > 0) {
        if (dojo.byId('trBreadCrumbs').style.display == "block") {
            var heightBreadCrumbs = dojo.coords(dojo.byId('trBreadCrumbs')).h;
            if (isMobileDevice) {
                dojo.byId('divAddressScrollContent').style.height = ((height - 126) - heightBreadCrumbs) + "px";
            } else if (isTablet) {
                dojo.byId('divAddressScrollContent').style.height = ((height - 175) - heightBreadCrumbs) + "px";
            } else {
                dojo.byId('divAddressScrollContent').style.height = ((height - 162) - heightBreadCrumbs) + "px";
            }
        } else {
            if (isMobileDevice) {
                dojo.byId('divAddressScrollContent').style.height = ((height - 126)) + "px";
            } else if (isTablet) {
                dojo.byId('divAddressScrollContent').style.height = ((height - 175)) + "px";
            } else {
                dojo.byId('divAddressScrollContent').style.height = ((height - 152)) + "px";
            }
        }

        if (isMobileDevice) {
            var searchTabWidth = ((dojo.window.getBox().w - 100) / 3) + "px"
            dojo.byId("tdSearchAddress").style.width = searchTabWidth;
            dojo.byId("tdSearchLocation").style.width = searchTabWidth;
            dojo.byId("tdSearchPermit").style.width = searchTabWidth;
            dojo.byId("divAddressPlaceHolder").style.width = (dojo.window.getBox().w - 30) + "px";
            dojo.byId("tdBreadCrumbs").style.width = (dojo.window.getBox().w - 40) + "px";
        } else {
            if (dojo.isIE) {
                dojo.byId("tdBreadCrumbs").style.width = dojo.coords(dojo.byId('divAddressPlaceHolder')).w - 20 + "px";
            }
            else {
                dojo.byId("tdBreadCrumbs").style.width = dojo.coords(dojo.byId('divAddressPlaceHolder')).w - 10 + "px";
            }
        }
    }
    CreateScrollbar(dojo.byId("divAddressScrollContainer"), dojo.byId("divAddressScrollContent"));
}

//Hide infowindow container
function HideInfoContainer() {
    selectedMapPoint = featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = point = null;
    map.infoWindow.hide();
    if (isMobileDevice) {
        setTimeout(function () {
            dojo.byId('divInfoContainer').style.display = "none";
            dojo.replaceClass("divInfoContent", "hideContainer", "showContainer");
        }, 500);
    } else {
        dojo.byId('divInfoContent').style.display = "none";
        dojo.byId("divInfoDetails").style.display = "none";
    }
}

//Set height for infowindow container
function SetViewDetailsHeight() {
    var height = (isMobileDevice) ? (dojo.window.getBox().h) : dojo.coords(dojo.byId('divInfoContent')).h;
    if (height > 0) {
        dojo.byId('divInfoDetailsScroll').style.height = (height - ((!isTablet) ? 65 : 55)) + "px";
    }
    CreateScrollbar(dojo.byId("divInfoDetails"), dojo.byId("divInfoDetailsScroll"));
}

//Set height for infowindow container for overlapping permits
function SetPermitDataHeight() {
    var height = (isMobileDevice) ? dojo.window.getBox().h : dojo.coords(dojo.byId('divInfoContent')).h;
    if (height > 0) {
        dojo.byId('divPermitScrollContent').style.height = (height - ((!isTablet) ? 62 : 55)) + "px";
    }
    if (isMobileDevice) {
        dojo.byId('divPermitDataScrollContainer').style.width = dojo.window.getBox().w - 15 + "px";
    }
    CreateScrollbar(dojo.byId("divPermitDataScrollContainer"), dojo.byId("divPermitScrollContent"));
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
    RePositionMap();
    dojo.replaceClass("divLayerContainer", "hideContainerHeight", "showContainerHeight");
    dojo.byId('divLayerContainer').style.height = '0px';
}

function RePositionMap() {
    var ext = map.extent;
    ext.xmin = (map.extent.xmin + 1);
    map.setExtent(ext);
}

//Hide the share app container
function HideShareAppContainer() {
    RePositionMap();
    dojo.replaceClass("divAppContainer", "hideContainerHeight", "showContainerHeight");
    dojo.byId('divAppContainer').style.height = '0px';
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

    url = dojo.string.substitute(mapSharingOptions.TinyURLServiceURL, [urlStr]);

    dojo.io.script.get({
        url: url,
        callbackParamName: "callback",
        load: function (data) {
            tinyResponse = data;
            tinyUrl = data;
            var attr = mapSharingOptions.TinyURLResponseAttribute.split(".");
            for (var x = 0; x < attr.length; x++) {
                tinyUrl = tinyUrl[attr[x]];
            }
            if (ext) {
                HideBaseMapLayerContainer();
                HideAddressContainer();
                var cellHeight = (isMobileDevice || isTablet) ? 81 : 60;

                if (dojo.coords("divAppContainer").h > 0) {
                    HideShareAppContainer();
                } else {
                    dojo.byId('divAppContainer').style.height = cellHeight + "px";
                    dojo.replaceClass("divAppContainer", "showContainerHeight", "hideContainerHeight");
                }
            }
        },
        error: function (error) {
            alert(tinyResponse.error);
        }
    });
    setTimeout(function () {
        if (!tinyResponse) {
            alert(messages.getElementsByTagName("tinyURLEngine")[0].childNodes[0].nodeValue);
            return;
        }
    }, 6000);
}

//Open login page for facebook,tweet and open Email client with shared link for Email
function Share(site) {
    if (dojo.coords("divAppContainer").h > 0) {
        dojo.replaceClass("divAppContainer", "hideContainerHeight", "showContainerHeight");
        dojo.byId('divAppContainer').style.height = '0px';
    }
    if (tinyUrl) {
        switch (site) {
            case "facebook":
                window.open(dojo.string.substitute(mapSharingOptions.FacebookShareURL, [tinyUrl]));
                break;
            case "twitter":
                window.open(dojo.string.substitute(mapSharingOptions.TwitterShareURL, [tinyUrl]));
                break;
            case "mail":
                parent.location = dojo.string.substitute(mapSharingOptions.ShareByMailLink, [tinyUrl]);
                break;
        }
    } else {
        alert(messages.getElementsByTagName("tinyURLEngine")[0].childNodes[0].nodeValue);
        return;
    }
}

//Get current map Extent
function GetMapExtent() {
    var extents = Math.round(map.extent.xmin).toString() + "," + Math.round(map.extent.ymin).toString() + "," +
        Math.round(map.extent.xmax).toString() + "," + Math.round(map.extent.ymax).toString();
    return (extents);
}

//Get the query string value of the provided key
function GetQuerystring(key) {
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
    dojo.byId('divLoadingIndicator').style.display = "block";
}

//Hide progress indicator
function HideProgressIndicator() {
    dojo.byId('divLoadingIndicator').style.display = "none";
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

    if (dojo.byId("tdSearchLocation").className == "tdSearchByLocation") {
        ResetTargetValue(target, "defaultLocation", "gray");
    } else if (dojo.byId("tdSearchPermit").className == "tdSearchByPermit") {
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
    lastSearchString = dojo.byId("txtAddress").value.trim();
}

//Display the view to search by address
function ShowAddressSearchView() {
    if (dojo.byId("imgSearchLoader").style.display == "block") {
        return;
    }
    dojo.byId("trBreadCrumbs").style.display = "none";
    dojo.byId("txtAddress").value = dojo.byId("txtAddress").getAttribute("defaultAddress");
    lastSearchString = dojo.byId("txtAddress").value.trim();
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    dojo.byId("tdSearchAddress").className = "tdSearchByAddress";
    dojo.byId("tdSearchLocation").className = "tdSearchByUnSelectedLocation";
    dojo.byId("tdSearchPermit").className = "tdSearchByUnSelectedPermit";
}

//Display the view to search by location
function ShowLocationSearchView() {
    if (dojo.byId("tdBreadCrumbs").innerHTML.trim() == "") {
        dojo.byId("trBreadCrumbs").style.display = "none";
    } else {
        dojo.byId("trBreadCrumbs").style.display = "block";
        SetAddressResultsHeight();
    }
    if (dojo.byId("imgSearchLoader").style.display == "block") {
        return;
    }
    dojo.byId("txtAddress").value = dojo.byId("txtAddress").getAttribute("defaultLocation");
    lastSearchString = dojo.byId("txtAddress").value.trim();
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    dojo.byId("tdSearchAddress").className = "tdSearchByUnSelectedAddress";
    dojo.byId("tdSearchLocation").className = "tdSearchByLocation";
    dojo.byId("tdSearchPermit").className = "tdSearchByUnSelectedPermit";
}

//Display the view to search by permit
function ShowPermitSearchView() {
    if (dojo.byId("imgSearchLoader").style.display == "block") {
        return;
    }
    dojo.byId("trBreadCrumbs").style.display = "none";
    dojo.byId("txtAddress").value = dojo.byId("txtAddress").getAttribute("defaultPermit");
    lastSearchString = dojo.byId("txtAddress").value.trim();
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    dojo.byId("tdSearchAddress").className = "tdSearchByUnSelectedAddress";
    dojo.byId("tdSearchLocation").className = "tdSearchByUnSelectedLocation";
    dojo.byId("tdSearchPermit").className = "tdSearchByPermit";
}

//Create Dynamic map services
function CreateDynamicMapServiceLayer(layerId, layerURL, renderer) {
    var imageParams = new esri.layers.ImageParameters();
    var lastindex = layerURL.lastIndexOf('/');
    var layerIndex = layerURL.substr(lastindex + 1)
    imageParams.layerIds = [layerURL.substr(lastindex + 1)];
    imageParams.layerOption = esri.layers.ImageParameters.LAYER_OPTION_SHOW;
    var dynamicLayer = layerURL.substring(0, lastindex);
    var layertype = dynamicLayer.substring(((dynamicLayer.lastIndexOf("/")) + 1), (dynamicLayer.length));
    if (layertype == "FeatureServer") {
        var layer = CreateFeatureServiceLayer(layerId, layerURL);
        return layer;
    } else {
        var dynamicLayer = layerURL.substring(0, lastindex);
        var dynamicMapService = new esri.layers.ArcGISDynamicMapServiceLayer(dynamicLayer, {
            imageParameters: imageParams,
            id: layerId,
            visible: true
        });
        if (renderer) {
            var optionsArray = [];
            var drawingOptions = new esri.layers.LayerDrawingOptions();
            drawingOptions.renderer = renderer;
            optionsArray[layerIndex] = drawingOptions;
            dynamicMapService.setLayerDrawingOptions(optionsArray);
        }
        return dynamicMapService;
    }
}

//Create feature services
function CreateFeatureServiceLayer(layerId, layerURL, renderer) {
    var featureLayer = new esri.layers.FeatureLayer(layerURL, {
        mode: esri.layers.FeatureLayer.MODE_SNAPSHOT,
        id: layerId,
        outFields: ["*"]
    });
    if (renderer) {
        featureLayer.setRenderer(renderer);
    }
    return featureLayer;
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
        dojo.empty(dojo.byId(container.id + 'scrollbar_track'));
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