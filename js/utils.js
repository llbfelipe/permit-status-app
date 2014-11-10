/*global alert,console,currentExtent:true,countyGeometry:true,extent:true,isTablet,isiOS,isCountySearched:true,js,dojo,isBrowser,mapExtent:true,highlightGraphicsLayerId:true,infoWindowLayerID:true,featureID:true,lastSearchString:true,esri,messages:true,responseObject:true,
addressSearchFlag:true,searchFeatureID:true,searchInfoWindowLayerID:true,searchQueryLayerID:true,searchSettings:true,selectedMapPoint:true,shareFlag:true,isMobileDevice:true,map:true,tempGraphicsLayerId:true,zoomDeferred:true,queryExecutedCount:true,glowRipple,hideRipple,mapSharingOptions */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
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
dojo.require("js.commonShare");

var commonShare = null;
var getTinyUrl = null;
var orientationChange = false; //variable for setting the flag on orientation
var tinyResponse; //variable for storing the response from tiny URL API
var tinyUrl; //variable for storing the tiny URL
var counter;
var featureArray = [];
var point = null;
var currentExtent; //variable for storing the current map extent for sharing

//Remove scroll bar

function removeScrollBar(container) {
    if (dojo.dom.byId(container.id + 'scrollbar_track')) {
        container.removeChild(dojo.dom.byId(container.id + 'scrollbar_track'));
    }
}

//Clear graphics on map

function clearGraphics(graphicsLayer) {
    if (map.getLayer(graphicsLayer)) {
        map.getLayer(graphicsLayer).clear();
    }
}

//Function to append ... for a long string

function _trimString(str, len) {
    return (str.length > len) ? str.substring(0, len) + "..." : str;
}

//Hide progress indicator

function hideProgressIndicator() {
    dojo.dom.byId('divLoadingIndicator').style.display = "none";
}

//Get extent from point to query the layer

function _extentFromPoint(point) {
    var tolerance, screenPoint, pnt1, pnt2, mapPoint1, mapPoint2;
    tolerance = isMobileDevice ? 15 : 10;
    screenPoint = map.toScreen(point);
    pnt1 = new esri.geometry.Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
    pnt2 = new esri.geometry.Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
    mapPoint1 = map.toMap(pnt1);
    mapPoint2 = map.toMap(pnt2);
    return new esri.geometry.Extent(mapPoint1.x, mapPoint1.y, mapPoint2.x, mapPoint2.y, map.spatialReference);
}

function highlightSelectedPermit(mapPoint) {
    var highlightSymbol, highlightGraphic, features, featureSet;
    if (mapPoint.type === "point") {
        glowRipple(mapPoint);
    } else {
        highlightSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                new dojo.Color([parseInt(responseObject.HighlightFeaturesSymbology.LineSymbolColor.split(",")[0], 10),
                    parseInt(responseObject.HighlightFeaturesSymbology.LineSymbolColor.split(",")[1], 10),
                    parseInt(responseObject.HighlightFeaturesSymbology.LineSymbolColor.split(",")[2], 10),
                    parseFloat(responseObject.HighlightFeaturesSymbology.LineSymbolTransparency.split(",")[0], 10)]), 2),
            new dojo.Color([parseInt(responseObject.HighlightFeaturesSymbology.FillSymbolColor.split(",")[0], 10),
                parseInt(responseObject.HighlightFeaturesSymbology.FillSymbolColor.split(",")[1], 10),
                parseInt(responseObject.HighlightFeaturesSymbology.FillSymbolColor.split(",")[2], 10),
                parseFloat(responseObject.HighlightFeaturesSymbology.FillSymbolTransparency.split(",")[0], 10)]));
        highlightGraphic = new esri.Graphic(mapPoint, highlightSymbol);
        features = [];
        features.push(highlightGraphic);
        featureSet = new esri.tasks.FeatureSet();
        featureSet.features = features;
        map.getLayer(highlightGraphicsLayerId).add(featureSet.features[0]);
    }

}

//Create scroll-bar

function createScrollbar(container, content) {
    var yMax, pxTop, yCoord, scrollbar_track, scrollbar_handle, isHandleClicked = false, startPos, scrollingTimer;
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
    scrollbar_track.style.right = 5 + 'px';
    scrollbar_handle = document.createElement('div');
    scrollbar_handle.className = 'scrollbar_handle';
    scrollbar_handle.id = container.id + "scrollbar_handle";
    scrollbar_track.appendChild(scrollbar_handle);
    container.appendChild(scrollbar_track);

    function _scrollDiv(evt) {
        var y, delta;
        evt = window.event || evt; //equalize event object
        delta = evt.detail ? evt.detail * (-120) : evt.wheelDelta; //delta returns +120 when wheel is scrolled up, -120 when scrolled down
        pxTop = scrollbar_handle.offsetTop;

        if (delta <= -120) {
            y = pxTop + 10;
            if (y > yMax) {
                y = yMax;
            } // Limit vertical movement
            if (y < 0) {
                y = 0;
            } // Limit vertical movement
            scrollbar_handle.style.top = y + "px";
            content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));

        } else {
            y = pxTop - 10;
            if (y > yMax) {
                y = yMax;
            } // Limit vertical movement
            if (y < 0) {
                y = 2;
            } // Limit vertical movement
            scrollbar_handle.style.top = (y - 2) + "px";
            content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));
        }
    }

    if ((content.scrollHeight - content.offsetHeight) <= 5) {
        scrollbar_handle.style.display = 'none';
        scrollbar_track.style.display = 'none';
    } else {
        scrollbar_handle.style.display = 'block';
        scrollbar_track.style.display = 'block';
        scrollbar_handle.style.height = Math.max(this.content.offsetHeight * (this.content.offsetHeight / this.content.scrollHeight), 25) + 'px';
        yMax = this.content.offsetHeight - scrollbar_handle.offsetHeight;
        yMax = yMax - 5; //for getting rounded bottom of handle
        if (window.addEventListener) {
            content.addEventListener('DOMMouseScroll', _scrollDiv, false);
        }
        content.onmousewheel = function (evt) {
            console.log(content.id);
            _scrollDiv(evt);
        };
    }

    //Attach events to scrollbar components
    scrollbar_track.onclick = function (evt) {
        var offsetY, coords, y;
        if (!isHandleClicked) {
            if (!evt) { evt = event; }
            pxTop = scrollbar_handle.offsetTop; // Sliders vertical position at start of slide.
            if (!evt.offsetY) {
                coords = dojo.coords(evt.target);
                offsetY = evt.layerY - coords.t;
            } else { offsetY = evt.offsetY; }
            if (offsetY < scrollbar_handle.offsetTop) {
                scrollbar_handle.style.top = offsetY + "px";
                content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));
            } else if (offsetY > (scrollbar_handle.offsetTop + scrollbar_handle.clientHeight)) {
                y = offsetY - scrollbar_handle.clientHeight;
                if (y > yMax) { y = yMax; } // Limit vertical movement
                if (y < 0) { y = 0; } // Limit vertical movement
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
        if (!evt) { evt = event; }
        evt.cancelBubble = true;
        if (evt.stopPropagation) { evt.stopPropagation(); }
        pxTop = scrollbar_handle.offsetTop; // Sliders vertical position at start of slide.
        yCoord = evt.screenY; // Vertical mouse position at start of slide.
        document.body.style.MozUserSelect = 'none';
        document.body.style.userSelect = 'none';
        document.onselectstart = function () {
            return false;
        };
        document.onmousemove = function (evt) {
            if (!evt) {
                evt = event;
            }
            evt.cancelBubble = true;
            if (evt.stopPropagation) { evt.stopPropagation(); }
            var y = pxTop + evt.screenY - yCoord;
            if (y > yMax) {
                y = yMax;
            } // Limit vertical movement
            if (y < 0) {
                y = 0;
            } // Limit vertical movement
            scrollbar_handle.style.top = y + "px";
            content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));
        };
    };

    document.onmouseup = function () {
        document.body.onselectstart = null;
        document.onmousemove = null;
    };

    scrollbar_handle.onmouseout = function (evt) {
        document.body.onselectstart = null;
    };

    var startPos;

    dojo.connect(container, "touchstart", function (evt) {
        touchStartHandler(evt);
    });

    dojo.connect(container, "touchmove", function (evt) {
        touchMoveHandler(evt);
    });

    dojo.connect(content, "touchstart", function (evt) {
        // Needed for iOS 8
    });

    dojo.connect(content, "touchmove", function (evt) {
        // Needed for iOS 8
    });

    //Handlers for Touch Events

    function touchStartHandler(e) {
        startPos = e.touches[0].pageY;
    }

    function touchMoveHandler(e) {
        var touch = e.touches[0];
        if (e.cancelBubble) e.cancelBubble = true;
        if (e.stopPropagation) e.stopPropagation();
        e.preventDefault();

        var change = startPos - touch.pageY;
        if (change !== 0) {
            pxTop = scrollbar_handle.offsetTop;
            var y = pxTop + change;

            //setting scrollbar handle
            if (y > yMax) y = yMax // Limit vertical movement
            if (y < 0) y = 0 // Limit vertical movement
            scrollbar_handle.style.top = y + "px";

            //setting content position
            content.scrollTop = Math.round(scrollbar_handle.offsetTop / yMax * (content.scrollHeight - content.offsetHeight));

            startPos = touch.pageY;
        }
    }
}

//Set height for InfoWindow container

function setViewDetailsHeight() {
    var height = isMobileDevice ? (dojo.window.getBox().h) : dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divInfoContent')).h;
    if (height > 0) {
        dojo.dom.byId('divInfoDetailsScroll').style.height = (height - ((!isTablet) ? 63 : 55)) + "px";
    }
    createScrollbar(dojo.dom.byId("divInfoDetails"), dojo.dom.byId("divInfoDetailsScroll"));
}

//Set height for InfoWindow container for overlapping permits

function _setPermitDataHeight() {
    var height = isMobileDevice ? dojo.window.getBox().h : dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divInfoContent')).h;
    if (height > 0) {
        dojo.dom.byId('divPermitScrollContent').style.height = (height - ((!isTablet) ? 62 : 55)) + "px";
    }
    createScrollbar(dojo.dom.byId("divPermitDataScrollContainer"), dojo.dom.byId("divPermitScrollContent"));
}

//Get the extent based on the map point

function _calculateCustomMapExtent(mapPoint) {
    var width, height, ratioHeight, totalYPoint, infoWindowHeight, xmin, xmax, ymin, ymax;
    width = map.extent.getWidth();
    height = map.extent.getHeight();
    ratioHeight = height / map.height;
    totalYPoint = map.infoWindow.infoWindowHeight + 30 + 58;
    infoWindowHeight = height - (ratioHeight * totalYPoint);
    xmin = mapPoint.x - (width / 2);
    ymin = mapPoint.y - infoWindowHeight;
    xmax = xmin + width;
    ymax = ymin + height;
    return new esri.geometry.Extent(xmin, ymin, xmax, ymax, map.spatialReference);
}

function _setCustomMapExtent(selectedMapPoint, flag) {
    hideProgressIndicator();
    map.setExtent(_calculateCustomMapExtent(selectedMapPoint));
    if (flag === 1) {
        setViewDetailsHeight();
    } else if (flag === 2) {
        _setPermitDataHeight();
    }
    if (extent !== "") {
        mapExtent = extent.split(',');
        mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
        map.setExtent(mapExtent);
        extent = "";
    }
}

// Position the infowindow to the center of the map

function _setZoomLevel(selectedMapPoint, flag) {
    var screenPoint;
    map.infoWindow.hide();
    screenPoint = map.toScreen(selectedMapPoint);
    screenPoint.y = map.height - screenPoint.y;
    map.infoWindow.show(screenPoint);
    if (map.height / 2 < map.infoWindow.infoWindowHeight + 30 + 58) {
        if (map.getLevel() !== responseObject.ZoomLevel) {
            zoomDeferred = map.setLevel(responseObject.ZoomLevel);
            map.infoWindow.hide();
            zoomDeferred.then(function () {
                _setCustomMapExtent(selectedMapPoint, flag);
            });
        } else {
            _setCustomMapExtent(selectedMapPoint, flag);
        }
    } else {
        hideProgressIndicator();
        map.centerAndZoom(selectedMapPoint, responseObject.ZoomLevel);
    }
}

//Set the zoom level for features according to the 'ZoomToPolygonGeometry' tag set in the config file

function _setFeatureZoomLevel(geometry, selectedMapPoint) {
    var ext, mapExtent, screenPoint;
    if (geometry.type === "point") {
        _setZoomLevel(selectedMapPoint, 1);
    } else {
        if (responseObject.ZoomToPolygonGeometry) {
            map.infoWindow.hide();
            //set the extent of the polygon and move it down vertically so that the infowindow is completely visible
            ext = geometry.getExtent().expand(3);
            ext.ymin = ext.ymin + ext.getHeight() / 4;
            ext.ymax = ext.ymax + ext.getHeight() / 4;
            map.setExtent(ext, true);
            screenPoint = map.toScreen(selectedMapPoint);
            screenPoint.y = map.height - screenPoint.y;
            map.infoWindow.show(screenPoint);
            hideProgressIndicator();
            if (extent !== "") {
                mapExtent = extent.split(',');
                mapExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
                map.setExtent(mapExtent);
                extent = "";
            }
        } else {
            _setZoomLevel(selectedMapPoint, 1);
        }
    }
}

//Fetch the geometry type of the mapPoint

function _getGeometryType(geometry) {
    var rings, points, selectedMapPoint, mapPoint;
    if (geometry.type !== "polygon") {
        selectedMapPoint = geometry;
    } else {
        mapPoint = geometry.getExtent().getCenter();
        if (!geometry.contains(mapPoint)) {
            //if the center of the polygon does not lie within the polygon
            rings = Math.floor(geometry.rings.length / 2);
            points = Math.floor(geometry.rings[rings].length / 2);
            selectedMapPoint = geometry.getPoint(rings, points);
        } else {
            //if the center of the polygon lies within the polygon
            selectedMapPoint = geometry.getExtent().getCenter();
        }
    }
    return selectedMapPoint;
}

//Function to get width of a control when text and font size are specified

function _getWidth(word, fontSize) {
    var test, w;
    test = document.createElement("span");
    document.body.appendChild(test);
    test.style.visibility = "hidden";
    test.style.fontSize = fontSize + "px";
    test.innerHTML = word;
    w = test.offsetWidth;
    document.body.removeChild(test);
    return w;
}

//Validate Email in InfoWindow

function _checkMailFormat(emailValue) {
    var pattern, returnVal = false;
    pattern = /^([a-zA-Z][a-zA-Z0-9\_\-\.]*\@[a-zA-Z0-9\-]*\.[a-zA-Z]{2,4})?$/i;
    if (pattern.test(emailValue)) {
        returnVal = true;
    }
    return returnVal;

}

//Create table row

function _createTableRow(trData, displayName, value) {
    var tdDisplayText, boxWidth, displayNameWord, tdFieldName, i, mail, link, word, wordWidth, displayNameWordWidth;
    tdDisplayText = document.createElement("td");
    tdDisplayText.innerHTML = displayName;
    boxWidth = isMobileDevice ? (dojo.window.getBox().w / 2) : (responseObject.InfoPopupWidth / 2);
    dojo['dom-class'].add(tdDisplayText, "tdDisplayField");
    dojo['dom-class'].add(tdDisplayText, "tdBreak");
    displayNameWord = displayName.split(" ");
    for (i = 0; i < displayNameWord.length; i++) {
        displayNameWordWidth = _getWidth(displayNameWord[i], 15);
        if (boxWidth < displayNameWordWidth) {
            tdDisplayText.className = "tdBreakWord";
        }
    }
    tdFieldName = document.createElement("td");
    dojo['dom-class'].add(tdFieldName, "tdFieldName");
    if (_checkMailFormat(value)) {
        tdFieldName.innerHTML = "";
        mail = document.createElement("u");
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
        link = document.createElement("u");
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
        word = value.split(" ");
        for (i = 0; i < word.length; i++) {
            wordWidth = _getWidth(word[i], 15);
            if (boxWidth < wordWidth) {
                tdFieldName.className = "tdBreakWord";
            }
        }
    }
    trData.appendChild(tdDisplayText);
    trData.appendChild(tdFieldName);
}

//Display InfoWindow

function showInfoWindowDetails(geometry, attributes, featureLength, layer, mapPoint, fields) {
    var index, value, tblInfoDetails, tbodyInfoDetails, j, date, utcMilliseconds, trInfoDetails, tempValue, fieldName;
    clearGraphics(tempGraphicsLayerId);
    dojo.dom.byId("tdList").style.display = "none";
    dojo.dom.byId("divPermitDataScrollContainer").style.display = "none";
    dojo['dom-construct'].empty(dojo.dom.byId("divPermitScrollContent"));
    if (featureLength > 1) {
        dojo.dom.byId("tdList").style.display = "block";
    }
    for (index in attributes) {
        if (attributes.hasOwnProperty(index)) {
            if (!attributes[index] || attributes[index] === " ") {
                attributes[index] = responseObject.ShowNullValueAs;
            }
        }
    }
    if (searchSettings[layer].InfoWindowHeader) {
        try {
            value = dojo.string.trim(dojo.string.substitute(searchSettings[layer].InfoWindowHeader, attributes));
        } catch (e) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        }
        if (isBrowser) {
            value = _trimString(value, Math.round(responseObject.InfoPopupWidth / 6));
        } else {
            value = _trimString(value, Math.round(responseObject.InfoPopupWidth / 10));
        }

        if (!isMobileDevice) {
            map.infoWindow.hide();
            selectedMapPoint = null;
            dojo.dom.byId('divInfoContent').style.display = "block";
            dojo.dom.byId('divInfoContent').style.width = responseObject.InfoPopupWidth + "px";
            dojo.dom.byId('divInfoContent').style.height = responseObject.InfoPopupHeight + "px";
            dojo.dom.byId("divInfoDetails").style.display = "block";
            map.infoWindow.resize(responseObject.InfoPopupWidth, responseObject.InfoPopupHeight);
            selectedMapPoint = _getGeometryType(geometry);
            point = mapPoint;
            _setFeatureZoomLevel(geometry, selectedMapPoint);
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
        tblInfoDetails = dojo.dom.byId('tblInfoDetails');
        tbodyInfoDetails = document.createElement("tbody");
        tblInfoDetails.appendChild(tbodyInfoDetails);
        for (j = 0; j < fields.length; j++) {
            if (fields[j].type === "esriFieldTypeDate") {
                if (attributes[fields[j].name]) {
                    if (Number(attributes[fields[j].name])) {
                        date = new js.date();
                        utcMilliseconds = Number(attributes[fields[j].name]);
                        attributes[fields[j].name] = dojo.date.locale.format(date.utcTimestampFromMs(utcMilliseconds), {
                            datePattern: responseObject.FormatDateAs,
                            selector: "date"
                        });
                    }
                }
            }
        }
        try {
            for (index = 0; index < searchSettings[layer].InfoWindowData.length; index++) {
                trInfoDetails = document.createElement("tr");
                tbodyInfoDetails.appendChild(trInfoDetails);
                if (searchSettings[layer].InfoWindowData[index].DisplayText && (searchSettings[layer].InfoWindowData[index].DisplayText !== "")) {
                    _createTableRow(trInfoDetails, searchSettings[layer].InfoWindowData[index].DisplayText, dojo.string.substitute(searchSettings[layer].InfoWindowData[index].FieldName, attributes));
                } else {
                    tempValue = searchSettings[layer].InfoWindowData[index].FieldName.split("{");
                    fieldName = tempValue[1].split("}");
                    for (j = 0; j < fields.length; j++) {
                        if (fields[j].alias === fieldName[0]) {
                            _createTableRow(trInfoDetails, fields[j].alias + ":", dojo.string.substitute(searchSettings[layer].InfoWindowData[index].FieldName, attributes));
                            break;
                        }
                    }
                }
            }
        } catch (ex) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
            zoomDeferred.cancel();
            map.infoWindow.hide();
            selectedMapPoint = null;
        }
        setViewDetailsHeight();
    } else {
        alert(dojo.string.substitute(messages.getElementsByTagName("noInfoWindowData")[0].childNodes[0].nodeValue, [searchSettings[layer].Title]));
        map.infoWindow.hide();
        selectedMapPoint = null;
        hideProgressIndicator();
    }
}

function _setListInfoWindowExtent(selectedMapPoint, flag) {
    var screenPoint = map.toScreen(selectedMapPoint);
    screenPoint.y = map.height - screenPoint.y;
    map.infoWindow.show(screenPoint);
    if (map.height / 2 < map.infoWindow.infoWindowHeight + 30 + 58) {
        _setCustomMapExtent(selectedMapPoint, flag);
    } else {
        hideProgressIndicator();
        if (flag === 1) {
            setViewDetailsHeight();
        } else if (flag === 2) {
            _setPermitDataHeight();
        }
        map.centerAt(selectedMapPoint);
    }
}

function _setPermitListContent(result, mapPoint, i, tbodyPermitList) {
    var trPermitList, tdFieldName, tdDisplayText, objID, j, index;
    trPermitList = document.createElement("tr");
    trPermitList.className = "trRowHeight";
    for (j = 0; j < featureArray[i].fields.length; j++) {
        if (featureArray[i].fields[j].type === "esriFieldTypeOID") {
            objID = featureArray[i].fields[j].name;
            break;
        }
    }
    trPermitList.id = featureArray[i].attr.attributes[objID];
    tbodyPermitList.appendChild(trPermitList);
    tdDisplayText = document.createElement("td");
    tdDisplayText.className = "cursorPointer";
    tdDisplayText.innerHTML = searchSettings[result[i].layerId].ListDisplayText;

    tdFieldName = document.createElement("td");
    tdFieldName.className = "cursorPointer";
    try {
        tdFieldName.innerHTML = result[i].attr.attributes[searchSettings[result[i].layerId].ListFieldName];
    } catch (e) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
    }

    if (featureArray[i].attr.attributes[objID] === Number(featureID)) {
        index = i;
    }
    trPermitList.onclick = function () {
        featureID = this.id;
        highlightSelectedPermit(featureArray[this.rowIndex].attr.geometry);
        infoWindowLayerID = searchSettings[featureArray[this.rowIndex].layerId].Title;
        showInfoWindowDetails(featureArray[this.rowIndex].attr.geometry, featureArray[this.rowIndex].attr.attributes, featureArray.length, featureArray[this.rowIndex].layerId, mapPoint, featureArray[this.rowIndex].fields);
    };
    trPermitList.appendChild(tdDisplayText);
    trPermitList.appendChild(tdFieldName);
    return index;
}
//Display list of permits in InfoWindow on map click

function _showPermitList(mapPoint, result, geometry) {
    var tblPermitList, tbodyPermitList, i, index;
    clearGraphics(tempGraphicsLayerId);
    dojo.dom.byId("divPermitDataScrollContainer").style.display = "block";
    dojo.dom.byId("tdList").style.display = "none";
    dojo.dom.byId("divInfoDetails").style.display = "none";
    dojo['dom-construct'].empty(dojo.dom.byId("divPermitScrollContent"));
    tblPermitList = document.createElement("table");
    dojo.dom.byId("divPermitScrollContent").appendChild(tblPermitList);
    tblPermitList.style.width = "100%";
    tblPermitList.style.textAlign = "left";
    tblPermitList.style.overflow = "hidden";
    tbodyPermitList = document.createElement("tbody");
    tblPermitList.appendChild(tbodyPermitList);

    for (i = 0; i < result.length; i++) {
        index = _setPermitListContent(result, mapPoint, i, tbodyPermitList);
    }
    if (!isMobileDevice) {
        dojo.dom.byId('divInfoContent').style.display = "block";
        dojo.dom.byId('divInfoContent').style.width = responseObject.InfoPopupWidth + "px";
        dojo.dom.byId('divInfoContent').style.height = responseObject.InfoPopupHeight + "px";
        dojo.dom.byId('tdInfoHeader').innerHTML = dojo.string.substitute(messages.getElementsByTagName("numberOfFeaturesFound")[0].childNodes[0].nodeValue, [result.length]);
        map.infoWindow.resize(responseObject.InfoPopupWidth, responseObject.InfoPopupHeight);
        selectedMapPoint = _getGeometryType(geometry);
        point = mapPoint;
        _setListInfoWindowExtent(selectedMapPoint, 2);
    } else {
        dojo.dom.byId('divInfoContainer').style.display = "block";
        dojo['dom-class'].replace("divInfoContainer", "opacityShowAnimation", "opacityHideAnimation");
        dojo['dom-class'].add("divInfoContainer", "divInfoContainer");
        dojo['dom-class'].replace("divInfoContent", "showContainer", "hideContainer");
        dojo['dom-class'].add("divInfoContent", "divInfoContent");
        dojo.dom.byId('tdInfoHeader').innerHTML = dojo.string.substitute(messages.getElementsByTagName("numberOfFeaturesFoundOnMobile")[0].childNodes[0].nodeValue, [result.length]);
        _setPermitDataHeight();
    }
    if (featureID && infoWindowLayerID && shareFlag) {
        showInfoWindowDetails(featureArray[index].attr.geometry, featureArray[index].attr.attributes, featureArray.length, featureArray[index].layerId, mapPoint, featureArray[index].fields);
    }
}

// Get data to be displayed in mobile callout content field

function getMobileCalloutContentField(index) {
    var i, def = new dojo.Deferred();
    esri.request({
        url: searchSettings[index].QueryURL + '?f=json',
        load: function (data) {
            if (data.displayField) {
                searchSettings[index].InfoWindowContent = "${" + data.displayField + "}";
            } else {
                for (i = 0; i < data.fields.length; i++) {
                    if (data.fields[i].type !== "esriFieldTypeOID") {
                        searchSettings[index].InfoWindowContent = "${" + data.fields[i].name + "}";
                        break;
                    }
                }
            }
            def.resolve();
        }
    });
    return def;
}

//Substitute string value for null values present in attributes

function formatNullValues(attributes) {
    var i;
    for (i in attributes) {
        if (attributes.hasOwnProperty(i)) {
            if (!attributes[i]) {
                attributes[i] = responseObject.ShowNullValueAs;
            }
        }
    }
}

//Display InfoWindow for mobile device on map click

function _showMobileInfoDetails(mapPoint, featureArray, geometry) {
    map.infoWindow.setTitle("");
    map.infoWindow.setContent("");
    clearGraphics(tempGraphicsLayerId);
    selectedMapPoint = _getGeometryType(geometry);
    point = mapPoint;
    map.infoWindow.resize(225, 65);
    currentExtent = map.extent;

    if (featureArray.length === 1) {
        _setFeatureZoomLevel(geometry, selectedMapPoint);
        formatNullValues(featureArray[0].attr.attributes);
        try {
            map.infoWindow.setTitle(_trimString(dojo.string.substitute(searchSettings[featureArray[0].layerId].InfoWindowHeader, featureArray[0].attr.attributes), 14));
            if (searchSettings[featureArray[0].layerId].InfoWindowContent && (dojo.string.trim(searchSettings[featureArray[0].layerId].InfoWindowContent))) {
                map.infoWindow.setContent(_trimString(dojo.string.substitute(searchSettings[featureArray[0].layerId].InfoWindowContent, featureArray[0].attr.attributes), 14));
            } else {
                getMobileCalloutContentField(featureArray[0].layerId).then(function () {
                    map.infoWindow.setContent(_trimString(dojo.string.substitute(searchSettings[featureArray[0].layerId].InfoWindowContent, featureArray[0].attr.attributes), 14));
                });
            }
        } catch (e) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        }
    } else {
        _setListInfoWindowExtent(selectedMapPoint, 0);
        try {
            map.infoWindow.setTitle(_trimString(dojo.string.substitute(messages.getElementsByTagName("numberOfFeaturesFoundOnMobile")[0].childNodes[0].nodeValue, [featureArray.length]), 14));
        } catch (ex) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        }
    }
    dojo.connect(map.infoWindow.imgDetailsInstance(), "onclick", function () {
        if (featureArray.length === 1) {
            dojo.dom.byId("tdList").style.display = "none";
            showInfoWindowDetails(mapPoint, featureArray[0].attr.attributes, featureArray.length, featureArray[0].layerId, null, featureArray[0].fields);
        } else {
            _showPermitList(featureArray[0].attr.geometry, featureArray);
            dojo.dom.byId("tdList").onclick = function () {
                _showPermitList(featureArray[0].attr.geometry, featureArray);
            };
        }
    });
}

//Store the query results in an array and determine if the results contain a single permit or a list of permits

function _fetchQueryResults(result, index, mapPoint) {
    var i;
    counter++;
    if (result) {
        if (result.features.length > 0) {
            for (i = 0; i < result.features.length; i++) {
                featureArray.push({
                    attr: result.features[i],
                    layerId: index,
                    fields: result.fields
                });
            }
        }
    }
    if (counter === searchSettings.length) {
        if (featureArray.length > 0) {
            currentExtent = map.extent;
            if (!isMobileDevice) {
                if (featureArray.length === 1) {
                    //Show details in an infowindow when a single result is fetched on map click
                    dojo.dom.byId("tdList").style.display = "none";
                    highlightSelectedPermit(featureArray[0].attr.geometry);
                    showInfoWindowDetails(featureArray[0].attr.geometry, featureArray[0].attr.attributes, featureArray.length, featureArray[0].layerId, mapPoint, featureArray[0].fields);
                } else {
                    //Show list of permits in an infowindow when multiple results are found at a particular point on map click
                    highlightSelectedPermit(featureArray[0].attr.geometry);
                    _showPermitList(mapPoint, featureArray, featureArray[0].attr.geometry);
                    dojo.dom.byId("tdList").onclick = function () {
                        highlightSelectedPermit(featureArray[0].attr.geometry);
                        featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = null;
                        _showPermitList(mapPoint, featureArray, featureArray[0].attr.geometry);
                    };
                }
            } else {
                hideProgressIndicator();
                _showMobileInfoDetails(mapPoint, featureArray, featureArray[0].attr.geometry);
            }
        } else {
            map.infoWindow.hide();
            selectedMapPoint = null;
            hideProgressIndicator();
        }

    }
}
//Perform queryTask on map layers

function _executeQueryTask(index, mapPoint) {
    var queryTask, query;
    queryTask = new esri.tasks.QueryTask(searchSettings[index].QueryURL);
    query = new esri.tasks.Query();
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.geometry = _extentFromPoint(mapPoint);
    query.orderByFields = [searchSettings[index].ListFieldName];
    query.outFields = ["*"];
    queryTask.execute(query, function (result) {
        _fetchQueryResults(result, index, mapPoint);
    }, function (err) {
        hideProgressIndicator();
        alert(dojo.string.substitute(messages.getElementsByTagName("dataNotFound")[0].childNodes[0].nodeValue, [searchSettings[index].Title]));
        _fetchQueryResults(null, null, mapPoint);
    });
}

// Search for permits when user clicks on the map

function findPermits(mapPoint) {
    var index;
    featureArray = [];
    counter = 0;
    for (index = 0; index < searchSettings.length; index++) {
        _executeQueryTask(index, mapPoint);
    }
}

//Display InfoWindow for mobile device on performing search

function showMobileInfoWindow(mapPoint, attributes, layerID, fields) {
    clearGraphics(tempGraphicsLayerId);
    map.infoWindow.setTitle("");
    map.infoWindow.setContent("");
    selectedMapPoint = _getGeometryType(mapPoint);
    point = selectedMapPoint;
    map.infoWindow.resize(225, 65);
    currentExtent = map.extent;
    _setFeatureZoomLevel(mapPoint, selectedMapPoint);
    formatNullValues(attributes);
    try {
        map.infoWindow.setTitle(_trimString(dojo.string.substitute(searchSettings[layerID].InfoWindowHeader, attributes), 14));
        if (searchSettings[layerID].InfoWindowContent && (dojo.string.trim(searchSettings[layerID].InfoWindowContent) !== "")) {
            map.infoWindow.setContent(_trimString(dojo.string.substitute(searchSettings[layerID].InfoWindowContent, attributes), 14));
        } else {
            getMobileCalloutContentField(layerID).then(function () {
                map.infoWindow.setContent(_trimString(dojo.string.substitute(searchSettings[layerID].InfoWindowContent, attributes), 14));
            });
        }
    } catch (e) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
    }
    dojo.connect(map.infoWindow.imgDetailsInstance(), "onclick", function () {
        dojo.dom.byId("tdList").style.display = "none";
        showInfoWindowDetails(mapPoint, attributes, null, layerID, null, fields);
    });
    hideProgressIndicator();
}

//Set height for splash screen

function setSplashScreenHeight() {
    var height = isMobileDevice ? (dojo.window.getBox().h - 110) : (dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divSplashScreenContent')).h - 80);
    dojo.dom.byId('divSplashContent').style.height = (height + 14) + "px";
    createScrollbar(dojo.dom.byId("divSplashContainer"), dojo.dom.byId("divSplashContent"));
}

//Set height and create scrollbar for address results

function setAddressResultsHeight() {
    var heightBreadCrumbs, height, searchTabWidth;
    height = isMobileDevice ? (dojo.window.getBox().h - 50) : dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divAddressContent')).h;
    if (height > 0) {
        if (dojo.dom.byId('divBreadCrumbs').style.display === "block") {
            heightBreadCrumbs = dojo['dom-geometry'].getMarginBox(dojo.dom.byId('divBreadCrumbs')).h;
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
            searchTabWidth = ((dojo.window.getBox().w - 100) / 3) + "px";
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
    createScrollbar(dojo.dom.byId("divAddressScrollContainer"), dojo.dom.byId("divAddressScrollContent"));
}

//Handle orientation change event

function orientationChanged() {
    if (map) {
        orientationChange = true;
        var timeout = (isMobileDevice && isiOS) ? 100 : 500;
        map.infoWindow.hide();
        setTimeout(function () {
            if (isMobileDevice) {
                map.reposition();
                map.resize();
                setAddressResultsHeight();
                setSplashScreenHeight();
                setTimeout(function () {
                    setViewDetailsHeight();
                    _setPermitDataHeight();
                    if (selectedMapPoint) {
                        _setListInfoWindowExtent(selectedMapPoint);
                    }
                    orientationChange = false;
                }, 500);
            } else {
                setTimeout(function () {
                    if (selectedMapPoint) {
                        _setListInfoWindowExtent(selectedMapPoint);
                    }
                    orientationChange = false;
                }, 500);
            }
        }, timeout);
    }
}

//Reset MapTip position on window resize/orientation change

function setMapTipPosition() {
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

//Handle resize event

function resizeHandler() {
    if (map) {
        map.reposition();
        map.resize();
    }
}

//Hide the base map container

function hideBaseMapLayerContainer() {
    dojo['dom-class'].replace("divLayerContainer", "hideContainerHeight", "showContainerHeight");
    dojo.dom.byId('divLayerContainer').style.height = '0px';
}

//Hide the share app container

function hideShareAppContainer() {
    dojo['dom-class'].replace("divAppContainer", "hideContainerHeight", "showContainerHeight");
    dojo.dom.byId('divAppContainer').style.height = '0px';
}

//Show address container

function ShowLocateContainer() {
    dojo.byId("txtAddress").blur();

    if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
        hideShareAppContainer();
    }
    if (dojo['dom-geometry'].getMarginBox("divLayerContainer").h > 0) {
        hideBaseMapLayerContainer();
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

            if (dojo.dom.byId("tdSearchLocation").className === "tdSearchByLocation") {
                if (dojo.dom.byId("divBreadCrumbs").style.display === "block") {
                    dojo.dom.byId("txtAddress").value = "";
                } else {
                    dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultLocation");
                }
            } else if (dojo.dom.byId("tdSearchPermit").className === "tdSearchByPermit") {
                dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultPermit");
            } else {
                dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultAddress");
            }
            lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
        }
    }
    setAddressResultsHeight();
}

//Hide address container

function hideAddressContainer() {
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


//Hide InfoWindow container

function HideInfoContainer() {
    selectedMapPoint = featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = point = null;
    map.getLayer(highlightGraphicsLayerId).clear();
    hideRipple();
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

//Get current map Extent

function _getMapExtent() {
    var extents = Math.round(map.extent.xmin).toString() + "," + Math.round(map.extent.ymin).toString() + "," +
        Math.round(map.extent.xmax).toString() + "," + Math.round(map.extent.ymax).toString();
    return extents;
}

//Create the tiny URL with current extent and selected feature

function shareLink(ext) {
    if (!commonShare) {
        commonShare = new js.CommonShare();
    }
    tinyUrl = null;
    var mapExtent, url, urlStr, currentMapExtent, encodedURL;
    mapExtent = _getMapExtent();
    if (currentExtent) {
        currentMapExtent = Math.round(currentExtent.xmin) + "," + Math.round(currentExtent.ymin) + "," + Math.round(currentExtent.xmax) + "," + Math.round(currentExtent.ymax);
    }
    url = esri.urlToObject(window.location.toString());

    if (point && !infoWindowLayerID && !searchInfoWindowLayerID) {
        urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$point=" + point.x + "," + point.y + "$currentExtent=" + currentMapExtent;
    } else if (point && infoWindowLayerID && !addressSearchFlag) {
        urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$point=" + point.x + "," + point.y + "$currentExtent=" + currentMapExtent + "$featureID=" + featureID + "$infoWindowLayerID=" + infoWindowLayerID;
    } else if (searchFeatureID && searchInfoWindowLayerID && addressSearchFlag) {
        urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$searchFeatureID=" + searchFeatureID + "$searchInfoWindowLayerID=" + searchInfoWindowLayerID + "$searchQueryLayerID=" + searchQueryLayerID;
    } else {
        urlStr = encodeURI(url.path) + "?extent=" + mapExtent;
    }
    //encodedURL = encodeURIComponent(urlStr);
    // Attempt the shrinking of the URL
    getTinyUrl = commonShare.getTinyLink(urlStr, mapSharingOptions.TinyURLServiceURL);
    if (ext) {
        hideBaseMapLayerContainer();
        hideAddressContainer();
        var cellHeight = (isMobileDevice || isTablet) ? 81 : 60;
        if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
            hideShareAppContainer();
        } else {
            dojo.dom.byId('divAppContainer').style.height = cellHeight + "px";
            dojo['dom-class'].replace("divAppContainer", "showContainerHeight", "hideContainerHeight");
        }
    }
}

//Open login page for facebook,tweet and open Email client with shared link for Email

function Share(site) {
    if (dojo['dom-geometry'].getMarginBox("divAppContainer").h > 0) {
        dojo['dom-class'].replace("divAppContainer", "hideContainerHeight", "showContainerHeight");
        dojo.dom.byId('divAppContainer').style.height = '0px';
    }
 // Do the share
    commonShare.share(getTinyUrl, mapSharingOptions, site);
}

//Get the query string value of the provided key

function getQueryString(key) {
    var extentValue = "", regex, qs;
    regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
    qs = regex.exec(window.location.href);
    if (qs && qs.length > 0) {
        extentValue = qs[1];
    }
    return extentValue;
}

//Show progress indicator

function showProgressIndicator() {
    dojo.dom.byId('divLoadingIndicator').style.display = "block";
}

//Show a transparent container above the search list while the search is still being performed

function showTransparentContainer() {
    dojo.dom.byId('divTransparentContainer').style.top = dojo['dom-geometry'].getMarginBox("divAddressContent").t + dojo['dom-geometry'].getMarginBox("tblAddressHeader").h + "px";
    dojo.dom.byId('divTransparentContainer').style.height = dojo['dom-geometry'].getMarginBox("divAddressResultContainer").h + "px";
    dojo.dom.byId('divTransparentContainer').style.display = "block";
}

//Hide the transparent container shown above the search list while the search is still being performed

function hideTransparentContainer() {
    dojo.dom.byId('divTransparentContainer').style.display = "none";
}

//Clear default value

function clearDefaultText(e) {
    var target = window.event ? window.event.srcElement : e ? e.target : null;
    if (!target) { return; }
    target.style.color = "#FFF";
    target.value = '';
}

//Set changed value for address/location/permit

function _resetTargetValue(target, title, color) {
    if (target.value === '' && target.getAttribute(title)) {
        target.value = target.title;
        if (target.title === "") {
            target.value = target.getAttribute(title);
        }
    }
    target.style.color = color;
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
}

//Set default value

function replaceDefaultText(e) {
    var target = window.event ? window.event.srcElement : e ? e.target : null;
    if (!target) { return; }

    if (dojo.dom.byId("tdSearchLocation").className === "tdSearchByLocation") {
        _resetTargetValue(target, "defaultLocation", "gray");
    } else if (dojo.dom.byId("tdSearchPermit").className === "tdSearchByPermit") {
        _resetTargetValue(target, "defaultPermit", "gray");
    } else {
        _resetTargetValue(target, "defaultAddress", "gray");
    }
}

//Display the view to search by address

function ShowAddressSearchView() {
    if (dojo.dom.byId("imgSearchLoader").style.display === "block") {
        return;
    }
    dojo.dom.byId("divBreadCrumbs").style.display = "none";
    dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultAddress");
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("tdSearchAddress").className = "tdSearchByAddress";
    dojo.dom.byId("tdSearchLocation").className = "tdSearchByUnSelectedLocation";
    dojo.dom.byId("tdSearchPermit").className = "tdSearchByUnSelectedPermit";
}

//Clear breadcrumbs container and clear the previously searched results

function clearBreadCrumbs() {
    dojo.dom.byId("divBreadCrumbs").style.display = "none";
    dojo.dom.byId("tdBreadCrumbs").innerHTML = "";
    queryExecutedCount = 0;
    countyGeometry = null;
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    hideTransparentContainer();
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    isCountySearched = false;
}

//Display the view to search by location

function ShowLocationSearchView() {
    if (dojo.string.trim(dojo.dom.byId("tdBreadCrumbs").innerHTML) === "") {
        dojo.dom.byId("divBreadCrumbs").style.display = "none";
        dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultLocation");
    } else {
        clearBreadCrumbs();
        dojo.dom.byId("txtAddress").value = "";
    }
    if (dojo.dom.byId("imgSearchLoader").style.display === "block") {
        return;
    }
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("tdSearchAddress").className = "tdSearchByUnSelectedAddress";
    dojo.dom.byId("tdSearchLocation").className = "tdSearchByLocation";
    dojo.dom.byId("tdSearchPermit").className = "tdSearchByUnSelectedPermit";
}

//Display the view to search by permit

function ShowPermitSearchView() {
    if (dojo.dom.byId("imgSearchLoader").style.display === "block") {
        return;
    }
    dojo.dom.byId("divBreadCrumbs").style.display = "none";
    dojo.dom.byId("txtAddress").value = dojo.dom.byId("txtAddress").getAttribute("defaultPermit");
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("tdSearchAddress").className = "tdSearchByUnSelectedAddress";
    dojo.dom.byId("tdSearchLocation").className = "tdSearchByUnSelectedLocation";
    dojo.dom.byId("tdSearchPermit").className = "tdSearchByPermit";
}

//Create feature services

function _createFeatureServiceLayer(layerId, layerURL) {
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

//Add hosted services to the map

function _addHostedServices(layerURL, layerId) {
    var p, lyr;
    esri.request({
        url: layerURL + "?f=json",
        load: function (data) {
            for (p = 0; p < data.layers.length; p++) {
                lyr = layerURL + data.layers[p].id;
                _createFeatureServiceLayer(layerId + p, lyr);
            }
        },
        error: function (err) {
            alert(err.message);
        }
    });
}

//Create dynamic services

function _createDynamicServiceLayer(dynamicLayer, imageParams, layerId) {
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

//Create tiled services

function _createTiledServiceLayer(layerId, layerURL) {
    var layer, dynamicLayerId, tiledLayer, lastIndex;
    lastIndex = layerURL.lastIndexOf('/');
    layer = layerURL.substring(0, lastIndex);
    dynamicLayerId = layerURL.substr(lastIndex + 1);
    if (isNaN(dynamicLayerId) || dynamicLayerId === "") {
        if (layerURL.indexOf("/FeatureServer") >= 0) {
            if (isNaN(dynamicLayerId)) {
                _addHostedServices(layerURL + "/", layerId);
            } else if (dynamicLayerId === "") {
                _addHostedServices(layerURL, layerId);
            }
        } else {
            tiledLayer = new esri.layers.ArcGISTiledMapServiceLayer(layerURL, {
                id: layerId
            });
        }
    } else {
        if (layerURL.indexOf("/FeatureServer") >= 0) {
            _addHostedServices(layerURL, layerId);
        } else {
            tiledLayer = new esri.layers.ArcGISTiledMapServiceLayer(layer, {
                id: layerId
            });
        }
    }

    dojo.connect(tiledLayer, "onError", function (err) {
        if (tiledLayer.tileInfo && tiledLayer.tileInfo.lods.length === 0) {
            alert(dojo.string.substitute(messages.getElementsByTagName("noLODs")[0].childNodes[0].nodeValue, [tiledLayer.id]));
        } else {
            alert(messages.getElementsByTagName("layerLoadError")[0].childNodes[0].nodeValue + " " + err.message);
        }
    });
    map.addLayer(tiledLayer);
}

//Create map services based on the LoadAsServiceType value coming from the config file

function addServiceLayers(layerId, layerURL, layerType) {
    var imageParams, dynamicLayerId, lastIndex, dynamicLayer;
    switch (layerType.toLowerCase()) {
    case "dynamic":
        imageParams = new esri.layers.ImageParameters();
        lastIndex = layerURL.lastIndexOf('/');
        dynamicLayerId = layerURL.substr(lastIndex + 1);
        if (isNaN(dynamicLayerId) || dynamicLayerId === "") {
            if (isNaN(dynamicLayerId)) {
                dynamicLayer = layerURL + "/";
            } else if (dynamicLayerId === "") {
                dynamicLayer = layerURL;
            }
            if (layerURL.indexOf("/FeatureServer") >= 0) {
                _addHostedServices(dynamicLayer, layerId);
            } else {
                _createDynamicServiceLayer(dynamicLayer, imageParams, layerId);
            }
        } else {
            imageParams.layerIds = [dynamicLayerId];
            imageParams.layerOption = esri.layers.ImageParameters.LAYER_OPTION_SHOW;
            dynamicLayer = layerURL.substring(0, lastIndex);
            if (layerURL.indexOf("/FeatureServer") >= 0) {
                _addHostedServices(dynamicLayer, layerId);
            } else {
                _createDynamicServiceLayer(dynamicLayer, imageParams, layerId);
            }
        }
        break;
    case "tiled":
        _createTiledServiceLayer(layerId, layerURL);
        break;
    case "feature":
        _createFeatureServiceLayer(layerId, layerURL);
        break;
    default:
        alert(dojo.string.substitute(messages.getElementsByTagName("invalidServiceType")[0].childNodes[0].nodeValue, [layerType]));
    }
}
