/*global alert,addressSearchFlag:true,baseMapId:true,countyLayerData:true,dojo,esri,featureID:true,geometryService:true,highlightPointGraphicsLayerId:true,highlightGraphicsLayerId:true,infoWindowLayerID:true,isCountySearched:true,isMobileDevice,isWebMap:true,operationalLayers:true,lastSearchString:true,lastSearchTime:true,map:true,messages:true,mapPoint:true,responseObject:true,searchFeatureID:true,searchInfoWindowLayerID:true,
searchSettings:true,searchQueryLayerID:true,selectedMapPoint:true,tempGraphicsLayerId:true,point:true,webmapExtent:true,highlightSelectedPermit,showInfoWindowDetails,hideAddressContainer,showMobileInfoWindow,showProgressIndicator,hideProgressIndicator,removeScrollBar,hideTransparentContainer,setAddressResultsHeight,showTransparentContainer,formatNullValues,clearGraphics,hideBaseMapLayerContainer,hideShareAppContainer*/
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
var isAddressSearched;
var permitLayerCounter = 0;
var queryExecutedCount = 0;
var permitArray = [];
var intervalIDs = [];
var countyGeometry;
var isPermitNumberSearched = false;
var previousExtent;
var searchCounter;

function _clearAllIntervals() {
    var i;
    for (i = 0; i < intervalIDs.length; i++) {
        clearInterval(intervalIDs[i]);
        delete intervalIDs[i];
    }
    intervalIDs.length = 0;
}

function hideRipple() {
    _clearAllIntervals();
    map.getLayer(highlightPointGraphicsLayerId).clear();
}

//Locate searched permit on map and display the infowindow for the same

function _locatePermitOnMap(mapPoint, attributes, layerID, fields, geometryType) {
    map.getLayer(highlightGraphicsLayerId).clear();
    hideRipple();
    highlightSelectedPermit(mapPoint);
    if (!isMobileDevice) {
        if (mapPoint) {
            showInfoWindowDetails(mapPoint, attributes, null, layerID, null, fields);
        }
        if (dojo['dom-geometry'].getMarginBox("divAddressContent").h > 0) {
            dojo['dom-class'].replace("divAddressContent", "hideContainerHeight", "showContainerHeight");
            dojo.dom.byId('divAddressContent').style.height = '0px';
        }
    } else {
        if (mapPoint) {
            showMobileInfoWindow(mapPoint, attributes, layerID, fields);
        }
        hideAddressContainer();
    }
}

//Fetch data for the selected permit

function _fetchPermitData(permitData, arrPermits) {
    var i, attributes, queryTask, query, objID;
    attributes = arrPermits[permitData.getAttribute("index")].attributes;
    showProgressIndicator();
    map.infoWindow.hide();
    if (!isCountySearched) {
        dojo.dom.byId("txtAddress").value = permitData.getAttribute("defaultPermit");
        dojo.dom.byId('txtAddress').setAttribute("defaultPermit", permitData.getAttribute("defaultPermit"));
    } else {
        dojo.dom.byId("txtAddress").value = "";
        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", "");
    }
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    for (i = 0; i < attributes.fields.length; i++) {
        if (attributes.fields[i].type === "esriFieldTypeOID") {
            objID = attributes.fields[i].name;
            break;
        }
    }
    searchFeatureID = attributes.attr.attributes[objID];
    searchInfoWindowLayerID = searchSettings[attributes.index].Title;
    searchQueryLayerID = searchSettings[attributes.index].QueryLayerId;
    addressSearchFlag = true;
    if (isNaN(searchFeatureID)) {
        searchFeatureID = "'" + searchFeatureID + "'";
    }
    queryTask = new esri.tasks.QueryTask(attributes.layerID.QueryURL);
    query = new esri.tasks.Query();
    query.where = objID + "=" + searchFeatureID;
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        _locatePermitOnMap(featureSet.features[0].geometry, featureSet.features[0].attributes, attributes.index, featureSet.fields, featureSet.geometryType);
    }, function (err) {
        alert(err.message);
        hideProgressIndicator();
    });
}

//To check if infowindow data for this layer is accessible from the webmap or not.

function _checkInfoWindowData(arrPermits, i, tbodyAddressResults) {
    var lastIndex, layer, counter, trPermit, tdPermit, dynamicLayerId, defaultPermit;
    trPermit = document.createElement("tr");
    tbodyAddressResults.appendChild(trPermit);
    tdPermit = document.createElement("td");
    tdPermit.innerHTML = arrPermits[i].name;
    tdPermit.align = "left";
    dojo['dom-class'].add(tdPermit, "bottomBorder cursorPointer");
    tdPermit.setAttribute("index", i);
    defaultPermit = arrPermits[i].attributes.attr.attributes[arrPermits[i].searchDisplayField.split("$")[1].split("{")[1].split("}")[0]];
    tdPermit.setAttribute("defaultPermit", defaultPermit);
    tdPermit.onclick = function () {
        if (arrPermits[this.getAttribute("index")].attributes.layerID.InfoWindowHeader) {
            counter = 0;
            layer = arrPermits[this.getAttribute("index")].attributes.layerID.QueryURL;
            for (i = 0; i < operationalLayers.length; i++) {
                lastIndex = operationalLayers[i].ServiceURL.lastIndexOf('/');
                dynamicLayerId = operationalLayers[i].ServiceURL.substr(lastIndex + 1);
                if (isNaN(dynamicLayerId) || dynamicLayerId === "") {
                    counter++;
                } else {
                    if (operationalLayers[i].ServiceURL === layer) {
                        counter++;
                    }
                }
            }
            // To check if the queried layer is added on the map or not
            if (counter === 0) {
                alert(messages.getElementsByTagName("layerNotVisible")[0].childNodes[0].nodeValue);
            } else {
                _fetchPermitData(this, arrPermits);
            }
        } else {
            alert(dojo.string.substitute(messages.getElementsByTagName("noInfoWindowData")[0].childNodes[0].nodeValue, [arrPermits[this.getAttribute("index")].attributes.layerID.Title]));
        }
    };
    trPermit.appendChild(tdPermit);
}
//Populate candidate permit list in address container

function _populatePermits(permitArray) {
    var i, arrPermits, tableAddressResults, tbodyAddressResults;
    dojo['dom-construct'].empty(dojo.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    hideTransparentContainer();
    tableAddressResults = dojo.dom.byId("tblAddressResults");
    tbodyAddressResults = document.createElement("tbody");
    tableAddressResults.appendChild(tbodyAddressResults);
    tableAddressResults.cellSpacing = tableAddressResults.cellPadding = 0;

    arrPermits = [];
    try {
        for (i = 0; i < permitArray.length; i++) {
            arrPermits.push({
                attributes: permitArray[i],
                searchDisplayField: permitArray[i].layerID.SearchDisplayFields,
                name: dojo.string.substitute(permitArray[i].layerID.SearchDisplayFields, permitArray[i].attr.attributes)
            });
        }
    } catch (e) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
    }

    arrPermits.sort(function (a, b) {
        var returnVal = 1, nameA, nameB;
        nameA = a.name.toLowerCase();
        nameB = b.name.toLowerCase();
        if (nameA < nameB) {
            returnVal = -1;
        }
        return returnVal;
    });

    for (i = 0; i < arrPermits.length; i++) {
        _checkInfoWindowData(arrPermits, i, tbodyAddressResults);
    }
    setAddressResultsHeight();
}

//Display error message when locator service fails or does not return any data

function _locatorErrBack(errorMessage) {
    var tableErrorMsg, tbodyErrorMsg, trErrorMsg, tdErrorMsg;
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    hideTransparentContainer();
    tableErrorMsg = dojo.dom.byId("tblAddressResults");
    tbodyErrorMsg = document.createElement("tbody");
    tableErrorMsg.appendChild(tbodyErrorMsg);
    tableErrorMsg.cellSpacing = 0;
    tableErrorMsg.cellPadding = 0;
    trErrorMsg = document.createElement("tr");
    tbodyErrorMsg.appendChild(trErrorMsg);
    tdErrorMsg = document.createElement("td");
    if (errorMessage) {
        tdErrorMsg.innerHTML = errorMessage;
    } else {
        tdErrorMsg.innerHTML = messages.getElementsByTagName("invalidSearch")[0].childNodes[0].nodeValue;
    }
    tdErrorMsg.align = "left";
    dojo['dom-class'].add(tdErrorMsg, "bottomBorder");
    tdErrorMsg.style.cursor = "default";
    trErrorMsg.appendChild(tdErrorMsg);
}

//Get candidate results for searched permit and store it in an array

function _populatePermitData(featureSet, layer, index) {
    queryExecutedCount++;
    var num, currentSearchTime;
    currentSearchTime = lastSearchTime = (new Date()).getTime();
    if (currentSearchTime < lastSearchTime) {
        return;
    }
    if (featureSet) {
        if (featureSet.features.length > 0) {
            for (num = 0; num < featureSet.features.length; num++) {
                formatNullValues(featureSet.features[num].attributes);
                permitArray.push({
                    attr: featureSet.features[num],
                    fields: featureSet.fields,
                    index: index,
                    layerID: layer
                });
            }
        }
    }
    if (searchSettings.length === queryExecutedCount) {
        if (permitArray.length > 0) {
            queryExecutedCount = 0;
            _populatePermits(permitArray);
        } else {
            queryExecutedCount = 0;
            _locatorErrBack(messages.getElementsByTagName("noPermitFound")[0].childNodes[0].nodeValue);
            hideProgressIndicator();
        }
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        isPermitNumberSearched = false;
    }
}

//Query the layers to fetch permit results

function _fetchPermitResults(layer, polygonGeometry, index) {
    var queryTask, query;
    permitArray.length = 0;
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    showTransparentContainer();
    queryTask = new esri.tasks.QueryTask(layer.QueryURL);
    query = new esri.tasks.Query();
    if (!isCountySearched) {
        query.where = dojo.string.substitute(layer.SearchExpression, [dojo.string.trim(dojo.dom.byId("txtAddress").value).toUpperCase()]);
    } else {
        query.geometry = polygonGeometry;
        query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
    }
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = false;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        _populatePermitData(featureSet, layer, index);
    }, function (err) {
        alert(dojo.string.substitute(messages.getElementsByTagName("dataNotFound")[0].childNodes[0].nodeValue, [layer.Title]));
        _populatePermitData();
    });
}

//Navigate through the breadcrumbs.

function _navigateBreadCrumbs(pThis) {
    var county, index, polygon, list, itemsLength, items, i;
    county = dojo.fromJson(pThis.getAttribute("county"));
    if (!responseObject.CountyLayerData.UseGeocoderService) {
        polygon = new esri.geometry.Polygon(map.spatialReference);
        polygon.addRing(dojo.fromJson(pThis.getAttribute("countyGeometry")).rings[0]);
    }
    countyGeometry = new esri.geometry.Extent(parseFloat(county.xmin), parseFloat(county.ymin), parseFloat(county.xmax), parseFloat(county.ymax), map.spatialReference);
    map.setExtent(countyGeometry, true);
    previousExtent = countyGeometry;
    for (index = 0; index < searchSettings.length; index++) {
        if (responseObject.CountyLayerData.UseGeocoderService) {
            _fetchPermitResults(searchSettings[index], countyGeometry, index);
        } else {
            _fetchPermitResults(searchSettings[index], polygon, index);
        }
    }
    list = dojo.dom.byId("tdBreadCrumbs");
    items = list.getElementsByTagName("span");
    itemsLength = items.length;
    if (items.length) {
        for (i = itemsLength - 1; i >= 0; i--) {
            if (i > pThis.getAttribute("index")) {
                dojo.destroy(items[i]);
            }
        }
    }
}

//Locate selected location on map and add it to the breadcrumbs

function _showLocatedCountyOnMap(geometry, locationName) {
    var ext, index, span;
    if (!isMobileDevice) {
        showProgressIndicator();
    } else {
        dojo.dom.byId("imgSearchLoader").style.display = "block";
        showTransparentContainer();
    }
    isCountySearched = true;

    if (geometry) {
        countyGeometry = geometry.getExtent();
        map.setExtent(countyGeometry, true);
        hideProgressIndicator();
    }
    for (index = 0; index < searchSettings.length; index++) {
        _fetchPermitResults(searchSettings[index], geometry, index);
    }
    if (locationName) {
        dojo.dom.byId("divBreadCrumbs").style.display = "block";
        span = document.createElement("span");
        dojo.dom.byId("tdBreadCrumbs").appendChild(span);
        ext = { xmin: countyGeometry.xmin, ymin: countyGeometry.ymin, xmax: countyGeometry.xmax, ymax: countyGeometry.ymax };
        span.setAttribute("county", dojo.toJson(ext));
        span.setAttribute("countyGeometry", dojo.toJson(geometry));
        if (dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")).length > 0) {
            dojo['dom-class'].add(span, "spanBreadCrumbs");
            span.setAttribute("index", dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")).indexOf(span));
            span.innerHTML = " > " + locationName.split(",")[0];
        } else {
            dojo['dom-class'].add(span, "spanBreadCrumbs");
            span.innerHTML = locationName.split(",")[0];
            span.setAttribute("index", dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")).indexOf(span));
            setAddressResultsHeight();
        }
        span.onclick = function () {
            _navigateBreadCrumbs(this);
        };
    }
}

//Get the extent on which the search should be performed

function _getSearchExtent() {
    var searchExtent, mapExtent;
    if (isWebMap) {
        searchExtent = webmapExtent;
    } else {
        mapExtent = responseObject.DefaultExtent.split(',');
        searchExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
    }
    return searchExtent;
}


function _createExtentForCounty(ext) {
    var projExtent;
    projExtent = new esri.geometry.Extent({
        "xmin": parseFloat(ext.xmin),
        "ymin": parseFloat(ext.ymin),
        "xmax": parseFloat(ext.xmax),
        "ymax": parseFloat(ext.ymax),
        "spatialReference": {
            "wkid": 4326
        }
    });
    return projExtent;
}


function _getBaseMapId() {
    var bmap, bMap;
    if (isWebMap) {
        bmap = baseMapId;
    } else {
        for (bMap = 0; bMap < responseObject.BaseMapLayers.length; bMap++) {
            if (responseObject.BaseMapLayers[bMap].MapURL) {
                if (map.getLayer(responseObject.BaseMapLayers[bMap].Key).visible) {
                    bmap = responseObject.BaseMapLayers[bMap].Key;
                    break;
                }
            }
        }
    }
    return bmap;
}

//Locate searched address on map with pushpin graphic

function _locateAddressOnMap(mapPoint) {
    var bmap, locatorMarkupSymbol, graphic;
    showProgressIndicator();
    hideRipple();
    selectedMapPoint = null;
    featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = point = null;
    map.infoWindow.hide();
    clearGraphics(tempGraphicsLayerId);
    bmap = _getBaseMapId();
    if (!map.getLayer(bmap).fullExtent.contains(mapPoint)) {
        map.infoWindow.hide();
        mapPoint = selectedMapPoint = null;
        clearGraphics(tempGraphicsLayerId);
        hideProgressIndicator();
        alert(messages.getElementsByTagName("noDataAvlbl")[0].childNodes[0].nodeValue);
        return;
    }
    if (mapPoint) {
        map.setLevel(responseObject.ZoomLevel);
        map.centerAt(mapPoint);
        locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(responseObject.LocatorSettings.DefaultLocatorSymbol, responseObject.LocatorSettings.MarkupSymbolSize.width, responseObject.LocatorSettings.MarkupSymbolSize.height);
        graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
            "Locator": true
        }, null);
        map.getLayer(tempGraphicsLayerId).add(graphic);
        hideProgressIndicator();
    }
    hideAddressContainer();
}

function _validateResult(candidates, tbodyCandidate) {
    var trCandidate, tdCandidate, mapPoint, locationName, ext, countyExtent, candidateExtent, candidate;
    searchCounter++;
    candidate = candidates;
    trCandidate = document.createElement("tr");
    tbodyCandidate.appendChild(trCandidate);
    tdCandidate = document.createElement("td");
    tdCandidate.innerHTML = dojo.string.substitute(responseObject.LocatorSettings.Locators[0].DisplayField, candidate.attributes);
    tdCandidate.align = "left";
    dojo['dom-class'].add(tdCandidate, "bottomBorder cursorPointer");
    tdCandidate.setAttribute("x", candidate.location.x);
    tdCandidate.setAttribute("y", candidate.location.y);
    ext = { xmin: candidate.attributes.xmin, ymin: candidate.attributes.ymin, xmax: candidate.attributes.xmax, ymax: candidate.attributes.ymax };
    candidateExtent = new esri.geometry.Extent(parseFloat(candidate.attributes.xmin), parseFloat(candidate.attributes.ymin), parseFloat(candidate.attributes.xmax), parseFloat(candidate.attributes.ymax), candidate.location.spatialReference);
    tdCandidate.setAttribute("county", dojo.toJson(ext));
    tdCandidate.setAttribute("prevExtent", dojo.toJson(candidateExtent));
    tdCandidate.onclick = function () {
        if (!isMobileDevice) {
            map.infoWindow.hide();
        }
        mapPoint = new esri.geometry.Point(this.getAttribute("x"), this.getAttribute("y"), map.spatialReference);
        if (!isAddressSearched) {
            previousExtent = _createExtentForCounty(dojo.fromJson(this.getAttribute("prevExtent")));
            countyExtent = _createExtentForCounty(dojo.fromJson(this.getAttribute("county")));
            locationName = this.innerHTML;
            geometryService.project([countyExtent], map.spatialReference, function (results) {
                if (results.length) {
                    countyExtent = new esri.geometry.Extent(parseFloat(results[0].xmin), parseFloat(results[0].ymin), parseFloat(results[0].xmax), parseFloat(results[0].ymax), map.spatialReference);
                    dojo.dom.byId("txtAddress").value = "";
                    dojo.dom.byId('txtAddress').setAttribute("defaultLocation", "");
                    _showLocatedCountyOnMap(countyExtent, locationName);
                }
            });
        } else {
            dojo.dom.byId("txtAddress").value = this.innerHTML;
            dojo.dom.byId('txtAddress').setAttribute("defaultAddress", this.innerHTML);
            _locateAddressOnMap(mapPoint);
        }
        setAddressResultsHeight();
    };
    trCandidate.appendChild(tdCandidate);

}

function _getResultsForLocation(candidates, addressFieldName, locatorFieldValues, locatorFieldName, searchFields, tbodyCandidate) {
    var j, validResult, placeField;
    if (candidates.attributes[responseObject.LocatorSettings.Locators[0].AddressMatchScore.Field] > responseObject.LocatorSettings.Locators[0].AddressMatchScore.Value) {
        for (j in searchFields) {
            if (searchFields.hasOwnProperty(j)) {
                if (candidates.attributes[addressFieldName] === searchFields[j]) {
                    if (!isAddressSearched) {
                        if (candidates.attributes[addressFieldName] === responseObject.LocatorSettings.Locators[0].PlaceNameSearch.LocatorFieldValue) {
                            for (placeField in locatorFieldValues) {
                                if (locatorFieldValues.hasOwnProperty(placeField)) {
                                    if (candidates.attributes[locatorFieldName] !== locatorFieldValues[placeField]) {
                                        validResult = false;
                                    } else {
                                        validResult = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        validResult = true;
                    }
                    if (validResult) {
                        _validateResult(candidates, tbodyCandidate);
                    }
                }
            }
        }
    }
}

//Get candidate results for searched address/location and populate candidate address list in address container

function _showLocation(candidates, searchExtent) {
    searchCounter = 0;
    var s, i, tblAddressResults, tbodyAddressResults, searchFields, addressFieldValues, addressFieldName,
        newExtent, locatorFieldValues, locatorFieldName;
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    if (candidates.length > 0) {
        tblAddressResults = dojo.dom.byId("tblAddressResults");
        tbodyAddressResults = document.createElement("tbody");
        tblAddressResults.appendChild(tbodyAddressResults);
        tblAddressResults.cellSpacing = 0;
        tblAddressResults.cellPadding = 0;

        searchFields = [];

        addressFieldValues = responseObject.LocatorSettings.Locators[0].AddressSearch.FilterFieldValues;
        addressFieldName = responseObject.LocatorSettings.Locators[0].AddressSearch.FilterFieldName;
        locatorFieldValues = responseObject.LocatorSettings.Locators[0].PlaceNameSearch.FilterFieldValues;
        locatorFieldName = responseObject.LocatorSettings.Locators[0].PlaceNameSearch.FilterFieldName;

        if (!isAddressSearched) {
            searchFields.push(responseObject.LocatorSettings.Locators[0].PlaceNameSearch.LocatorFieldValue);
        } else {
            for (s in addressFieldValues) {
                if (addressFieldValues.hasOwnProperty(s)) {
                    searchFields.push(addressFieldValues[s]);
                }
            }
        }
        for (i in candidates) {
            if (candidates.hasOwnProperty(i)) {
                newExtent = { xmin: candidates[i].attributes.xmin, ymin: candidates[i].attributes.ymin, xmax: candidates[i].attributes.xmax, ymax: candidates[i].attributes.ymax };
                newExtent = _createExtentForCounty(newExtent);
                if (!isAddressSearched) {
                    if (previousExtent.intersects(newExtent)) {
                        if (dojo.toJson(previousExtent) !== dojo.toJson(newExtent)) {
                            _getResultsForLocation(candidates[i], addressFieldName, locatorFieldValues, locatorFieldName, searchFields, tbodyAddressResults);
                        }
                    }
                } else {
                    _getResultsForLocation(candidates[i], addressFieldName, locatorFieldValues, locatorFieldName, searchFields, tbodyAddressResults);
                }
            }
        }
        //Display error message if there are no valid candidate addresses
        if (searchCounter === 0) {
            _locatorErrBack();
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            hideTransparentContainer();
            return;
        }
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        hideTransparentContainer();
        setAddressResultsHeight();
    } else {
        _locatorErrBack();
    }
}

//Fetch the extent to be queried for address/location search

function _searchLocation() {
    var locator, searchFieldName, addressField = {}, searchExtent, currentSearchTime, options = {};
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    showTransparentContainer();
    currentSearchTime = lastSearchTime = (new Date()).getTime();

    if (!isAddressSearched) {
        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", dojo.dom.byId('txtAddress').value);
    } else {
        dojo.dom.byId('txtAddress').setAttribute("defaultAddress", dojo.dom.byId('txtAddress').value);
    }
    setAddressResultsHeight();
    locator = new esri.tasks.Locator(responseObject.LocatorSettings.Locators[0].LocatorURL);
    searchFieldName = responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchField;
    addressField[searchFieldName] = dojo.dom.byId('txtAddress').value;
    if (!isAddressSearched) {
        if (!countyGeometry) {
            previousExtent = _getSearchExtent();
            searchExtent = _getSearchExtent();
        } else {
            searchExtent = countyGeometry;
        }
    } else {
        searchExtent = _getSearchExtent();
    }

    options.address = addressField;
    options.outFields = responseObject.LocatorSettings.Locators[0].LocatorOutFields;
    options[responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchBoundaryField] = searchExtent;
    locator.outSpatialReference = map.spatialReference;
    locator.addressToLocations(options);
    locator.on("address-to-locations-complete", function (candidates) {
        if (currentSearchTime < lastSearchTime) {
            return;
        }
        _showLocation(candidates.addresses, searchExtent);
    }, function () {
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        _locatorErrBack("noSearchResults");
    });
}

//Query the location that is selected from the list of candidates to fetch its geometry

function _locateCountyOnMap() {
    var queryTask, query;
    isCountySearched = true;
    permitArray = [];
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
    query = new esri.tasks.Query();
    query.where = dojo.string.substitute(countyLayerData.SearchExpression, [dojo.string.trim(dojo.dom.byId("txtAddress").value).toUpperCase()]);
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
        _showLocatedCountyOnMap(featureSet.features[0].geometry, dojo.string.trim(dojo.dom.byId("txtAddress").value));
    });
}

function _setCountyListContent(featureSet, tbodyCounty, i) {
    var trCounty, tdCounty;
    trCounty = document.createElement("tr");
    tbodyCounty.appendChild(trCounty);
    tdCounty = document.createElement("td");
    tdCounty.innerHTML = dojo.string.substitute(countyLayerData.CountyDisplayField, featureSet[i].attributes);
    tdCounty.align = "left";
    dojo['dom-class'].add(tdCounty, "bottomBorder cursorPointer");
    tdCounty.setAttribute("index", i);
    tdCounty.onclick = function () {
        map.infoWindow.hide();
        dojo.dom.byId("txtAddress").value = this.innerHTML;
        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", this.innerHTML);
        lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
        _locateCountyOnMap();
    };
    trCounty.appendChild(tdCounty);
}
//Populate candidate location list in address container on location search

function _fetchCountyResults(featureset) {
    var currentSearchTime, tableCounty, tbodyCounty, i, featureSet;
    currentSearchTime = lastSearchTime = (new Date()).getTime();
    if (currentSearchTime < lastSearchTime) {
        return;
    }
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    hideTransparentContainer();
    if (featureset.length > 0) {
        if (dojo.byId("txtAddress").value !== "") {
            tableCounty = dojo.byId("tblAddressResults");
            tbodyCounty = document.createElement("tbody");
            tableCounty.appendChild(tbodyCounty);
            tableCounty.cellSpacing = tableCounty.cellPadding = 0;
            featureSet = [];
            try {
                for (i = 0; i < featureset.length; i++) {
                    featureSet.push({
                        attributes: featureset[i].attributes,
                        name: dojo.string.substitute(countyLayerData.CountyDisplayField, featureset[i].attributes)
                    });
                }
            } catch (e) {
                alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
            }

            featureSet.sort(function (a, b) {
                var nameA, nameB, returnVal = 1;
                nameA = a.name.toLowerCase();
                nameB = b.name.toLowerCase();
                if (nameA < nameB) {
                    returnVal = -1;
                }
                return returnVal;
            });

            for (i = 0; i < featureSet.length; i++) {
                _setCountyListContent(featureSet, tbodyCounty, i);
            }
            isCountySearched = false;
            setAddressResultsHeight();
        }
    } else {
        _locatorErrBack();
    }
}

//Get candidate results for searched location when the 'UseGeocoderService' flag is set to false

function _locateCounty() {
    var currentSearchTime, queryTask, query;


    currentSearchTime = lastSearchTime = (new Date()).getTime();
    mapPoint = null;
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    showTransparentContainer();
    setAddressResultsHeight();
    if (countyLayerData.ServiceURL) {
        queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
        query = new esri.tasks.Query();
        query.where = dojo.string.substitute(countyLayerData.SearchExpression, [dojo.string.trim(dojo.dom.byId("txtAddress").value).toUpperCase()]);
        if (isCountySearched) {
            query.geometry = countyGeometry;
            query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_WITHIN;
        }
        query.outSpatialReference = map.spatialReference;
        query.returnGeometry = false;
        query.outFields = ["*"];
        queryTask.execute(query, function (featureSet) {
            if (currentSearchTime < lastSearchTime) {
                return;
            }
            if (featureSet.features.length > 0) {
                _fetchCountyResults(featureSet.features);
            } else {
                dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
                removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
                _locatorErrBack();
            }
        }, function (err) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            hideTransparentContainer();
        });
    } else {
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        hideTransparentContainer();
    }
}


//Executed when user performs permit search.

function _locatePermitNumber() {
    var index;
    dojo.dom.byId('txtAddress').setAttribute("defaultPermit", dojo.dom.byId("txtAddress").value);
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    isCountySearched = false;
    permitArray.length = 0;
    mapPoint = null;
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    setAddressResultsHeight();
    for (index = 0; index < searchSettings.length; index++) {
        _fetchPermitResults(searchSettings[index], null, index);
    }
}

//Locate address

function validateLocateType() {
    var county, lastNode;
    if (dojo.string.trim(dojo.dom.byId("tdSearchAddress").className) === "tdSearchByAddress") {
        dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
        removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
        if (dojo.string.trim(dojo.dom.byId("txtAddress").value) === '') {
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
            removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            if (dojo.dom.byId("txtAddress").value !== "") {
                alert(messages.getElementsByTagName("addressToLocate")[0].childNodes[0].nodeValue);
            }
        } else {
            isAddressSearched = true;
            _searchLocation();
        }
    } else if (dojo.dom.byId("tdSearchLocation").className === "tdSearchByLocation") {
        if ((dojo.string.trim(dojo.dom.byId('txtAddress').value) === '')) {
            if ((dojo.dom.byId("divBreadCrumbs").style.display === "none")) {
                dojo.dom.byId("imgSearchLoader").style.display = "none";
                dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
                removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
                if (dojo.dom.byId("txtAddress").value !== "") {
                    alert(messages.getElementsByTagName("countyToLocate")[0].childNodes[0].nodeValue);
                }
            } else {
                dojo._base.array.forEach(dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")), function (node) {
                    lastNode = node;
                });
                selectedMapPoint = null;
                map.infoWindow.hide();
                county = dojo.fromJson(lastNode.getAttribute("county"));
                countyGeometry = new esri.geometry.Extent(parseFloat(county.xmin), parseFloat(county.ymin), parseFloat(county.xmax), parseFloat(county.ymax), map.spatialReference);
                _showLocatedCountyOnMap(countyGeometry, null);
            }
        } else if (countyLayerData) {
            if (countyLayerData.UseGeocoderService) {
                isAddressSearched = false;
                _searchLocation();
            } else {
                isAddressSearched = false;
                _locateCounty();
            }
        } else {
            isAddressSearched = false;
            _searchLocation();
        }
    } else if (dojo.byId("tdSearchPermit").className === "tdSearchByPermit") {
        if (dojo.string.trim(dojo.dom.byId('txtAddress').value) === '') {
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
            removeScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            if (dojo.dom.byId("txtAddress").value !== "") {
                alert(messages.getElementsByTagName("permitToLocate")[0].childNodes[0].nodeValue);
            }
        } else {
            isAddressSearched = false;
            if (!isPermitNumberSearched) {
                isPermitNumberSearched = true;
                _locatePermitNumber();
            }
        }
    }
}

//Show ripple for point feature on address search

function glowRipple(mapPoint) {
    var layer, rippleSize, rippleColor, i, flag, intervalID, symbol, features = [], featureSet, highlightGraphic;
    hideRipple();
    layer = map.getLayer(highlightPointGraphicsLayerId);
    rippleSize = responseObject.HighlightFeaturesSymbology.MarkerSymbolSize;
    rippleColor = [parseInt(responseObject.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[0], 10), parseInt(responseObject.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[1], 10), parseInt(responseObject.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[2], 10), parseFloat(responseObject.HighlightFeaturesSymbology.MarkerSymbolTransparency.split(",")[0], 10)];
    i = rippleSize;
    flag = true;
    intervalID = setInterval(function () {
        layer.clear();
        if (i === rippleSize) {
            flag = false;
        } else if (i === (rippleSize - 4)) {
            flag = true;
        }
        symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, (i - 1) * 2,
            new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                new dojo.Color(rippleColor), 6),
            new dojo.Color([0, 0, 0, 0])).setOffset(0, -4);

        highlightGraphic = new esri.Graphic(mapPoint, symbol, null, null);
        features = [];
        features.push(highlightGraphic);
        featureSet = new esri.tasks.FeatureSet();
        featureSet.features = features;
        layer.add(featureSet.features[0]);
        if (flag) {
            i++;
        } else {
            i--;
        }
    }, 100);
    intervalIDs[intervalIDs.length] = intervalID;
}

//Handles errors during geolocation (locate the current location of the user)

function _geolocationErrorHandler(error) {
    switch (error.code) {
    case error.TIMEOUT:
        alert(messages.getElementsByTagName("geolocationTimeout")[0].childNodes[0].nodeValue);
        break;
    case error.POSITION_UNAVAILABLE:
        alert(messages.getElementsByTagName("geolocationPositionUnavailable")[0].childNodes[0].nodeValue);
        break;
    case error.PERMISSION_DENIED:
        alert(messages.getElementsByTagName("geolocationPermissionDenied")[0].childNodes[0].nodeValue);
        break;
    case error.UNKNOWN_ERROR:
        alert(messages.getElementsByTagName("geolocationUnKnownError")[0].childNodes[0].nodeValue);
        break;
    }
}

//Display the current location of the user and a pushpin at that location

function ShowMyLocation() {
    var cTimeout, graphicCollection, bmap, locatorMarkupSymbol, graphic, backupTimeoutTimer, cBackupTimeout, mapPoint;
    clearGraphics(tempGraphicsLayerId);
    hideBaseMapLayerContainer();
    hideShareAppContainer();
    hideAddressContainer();
    cTimeout = 8000;
    cBackupTimeout = 16000;
    backupTimeoutTimer = setTimeout(function () {
        alert(messages.getElementsByTagName("geolocationPositionUnavailable")[0].childNodes[0].nodeValue);
    }, cBackupTimeout);

    navigator.geolocation.getCurrentPosition(function (position) {
        clearTimeout(backupTimeoutTimer);
        showProgressIndicator();
        mapPoint = new esri.geometry.Point(position.coords.longitude, position.coords.latitude, new esri.SpatialReference({
            wkid: 4326
        }));
        graphicCollection = new esri.geometry.Multipoint(new esri.SpatialReference({
            wkid: 4326
        }));
        graphicCollection.addPoint(mapPoint);
        map.infoWindow.hide();
        geometryService.project([graphicCollection], map.spatialReference, function (newPointCollection) {
            bmap = _getBaseMapId();
            if (!map.getLayer(bmap).fullExtent.contains(newPointCollection[0].getPoint(0))) {
                mapPoint = selectedMapPoint = null;
                clearGraphics(tempGraphicsLayerId);
                map.infoWindow.hide();
                hideProgressIndicator();
                alert(messages.getElementsByTagName("geoLocation")[0].childNodes[0].nodeValue);
                return;
            }
            selectedMapPoint = null;
            featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = null;
            map.infoWindow.hide();
            mapPoint = newPointCollection[0].getPoint(0);
            map.setLevel(responseObject.ZoomLevel);
            map.centerAt(mapPoint);
            locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(responseObject.LocatorSettings.DefaultLocatorSymbol, responseObject.LocatorSettings.MarkupSymbolSize.width, responseObject.LocatorSettings.MarkupSymbolSize.height);
            graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
                "Locator": true
            }, null);
            map.getLayer(tempGraphicsLayerId).add(graphic);
            hideProgressIndicator();
        }, function (error) {
            alert(error.message);
            hideProgressIndicator();
        });
    },
        function (error) {
            clearTimeout(backupTimeoutTimer);
            hideProgressIndicator();
            _geolocationErrorHandler(error);
        }, {
            timeout: cTimeout
        });
}
function sendInfoDataRequest(index) {
    var p, objID, query, queryTask;
    queryTask = new esri.tasks.QueryTask(searchSettings[index].QueryURL);
    esri.request({
        url: searchSettings[index].QueryURL + "?f=json",
        load: function (data) {
            for (p = 0; p < data.fields.length; p++) {
                if (data.fields[p].type === "esriFieldTypeOID") {
                    objID = data.fields[p].name;
                    break;
                }
            }
            query = new esri.tasks.Query();
            query.where = objID + "=" + searchFeatureID;
            query.outFields = ["*"];
            query.outSpatialReference = map.spatialReference;
            query.returnGeometry = true;
            queryTask.execute(query, function (features) {
                formatNullValues(features.features[0].attributes);
                if (!isMobileDevice) {
                    showInfoWindowDetails(features.features[0].geometry, features.features[0].attributes, null, index, null, features.fields);
                } else {
                    showMobileInfoWindow(features.features[0].geometry, features.features[0].attributes, index, features.fields);
                }
            });
        },
        error: function (err) {
            alert(err.message);
        }
    });
}
//Query the features for sharing infowindow when user searches for a permit and locates it on the map

function shareInfoWindow() {
    var index;
    showProgressIndicator();
    for (index = 0; index < searchSettings.length; index++) {
        if (searchSettings[index].Title === searchInfoWindowLayerID && searchSettings[index].QueryLayerId === searchQueryLayerID) {
            sendInfoDataRequest(index);
            break;
        }
    }
    hideProgressIndicator();
}
