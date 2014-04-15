/*global */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true */
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

//Locate address

function ValidateLocateType() {
    if (dojo.string.trim(dojo.dom.byId("tdSearchAddress").className) == "tdSearchByAddress") {
        dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
        RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
        if (dojo.string.trim(dojo.dom.byId("txtAddress").value) == '') {
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
            RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            if (dojo.dom.byId("txtAddress").value != "") {
                alert(messages.getElementsByTagName("addressToLocate")[0].childNodes[0].nodeValue);
            }
            return;
        } else {
            isAddressSearched = true;
            SearchLocation();
        }
    }
    if (dojo.dom.byId("tdSearchLocation").className == "tdSearchByLocation") {
        if ((dojo.string.trim(dojo.dom.byId('txtAddress').value) == '')) {
            if ((dojo.dom.byId("divBreadCrumbs").style.display == "none")) {
                dojo.dom.byId("imgSearchLoader").style.display = "none";
                dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
                RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
                if (dojo.dom.byId("txtAddress").value != "") {
                    alert(messages.getElementsByTagName("countyToLocate")[0].childNodes[0].nodeValue);
                }
                return;
            } else {
                var lastNode;
                dojo._base.array.forEach(dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")), function (node) {
                    lastNode = node;
                });
                selectedMapPoint = null;
                map.infoWindow.hide();
                var county = dojo.fromJson(lastNode.getAttribute("county"));
                countyGeometry = new esri.geometry.Extent(parseFloat(county.xmin), parseFloat(county.ymin), parseFloat(county.xmax), parseFloat(county.ymax), map.spatialReference);
                ShowLocatedCountyOnMap(countyGeometry, null);
            }
        } else if (countyLayerData) {
            if (countyLayerData.UseGeocoderService) {
                isAddressSearched = false;
                SearchLocation();
            } else {
                isAddressSearched = false;
                LocateCounty();
            }
        } else {
            isAddressSearched = false;
            SearchLocation();
        }
    } else if (dojo.byId("tdSearchPermit").className == "tdSearchByPermit") {
        if (dojo.string.trim(dojo.dom.byId('txtAddress').value) == '') {
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
            RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            if (dojo.dom.byId("txtAddress").value != "") {
                alert(messages.getElementsByTagName("permitToLocate")[0].childNodes[0].nodeValue);
            }
            return;
        } else {
            isAddressSearched = false;
            if (!isPermitNumberSearched) {
                isPermitNumberSearched = true;
                LocatePermitNumber();
            }
        }
    }
}

//Fetch the extent to be queried for address/location search

function SearchLocation() {
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    ShowTransparentContainer();
    currentSearchTime = lastSearchTime = (new Date()).getTime();

    if (!isAddressSearched) {
        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", dojo.dom.byId('txtAddress').value);
    } else {
        dojo.dom.byId('txtAddress').setAttribute("defaultAddress", dojo.dom.byId('txtAddress').value);
    }
    SetAddressResultsHeight();
    var locator = new esri.tasks.Locator(responseObject.LocatorSettings.Locators[0].LocatorURL);
    var searchFieldName = responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchField;
    var addressField = {};
    addressField[searchFieldName] = dojo.dom.byId('txtAddress').value;
    var searchExtent;
    if (!isAddressSearched) {
        if (!countyGeometry) {
            previousExtent = GetSearchExtent();
            searchExtent = GetSearchExtent();
        } else {
            searchExtent = countyGeometry;
        }
    } else {
        searchExtent = GetSearchExtent();
    }

    var options = {};
    options["address"] = addressField;
    options["outFields"] = responseObject.LocatorSettings.Locators[0].LocatorOutFields;
    options[responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchBoundaryField] = searchExtent;
    locator.outSpatialReference = map.spatialReference;
    locator.addressToLocations(options);
    locator.on("address-to-locations-complete", function (candidates) {
        if (currentSearchTime < lastSearchTime) {
            return;
        }
        ShowLocation(candidates.addresses, searchExtent);
    }, function () {
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        LocatorErrBack("noSearchResults");
    });
}

//Get the extent on which the search should be performed

function GetSearchExtent() {
    var searchExtent;
    if (isWebMap) {
        searchExtent = webmapExtent;
    } else {
        var mapExtent = responseObject.DefaultExtent.split(',');
        searchExtent = new esri.geometry.Extent(parseFloat(mapExtent[0]), parseFloat(mapExtent[1]), parseFloat(mapExtent[2]), parseFloat(mapExtent[3]), map.spatialReference);
    }
    return searchExtent;
}

//Get candidate results for searched address/location and populate candidate address list in address container

function ShowLocation(candidates, searchExtent) {
    searchCounter = 0;
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    if (candidates.length > 0) {
        var tblAddressResults = dojo.dom.byId("tblAddressResults");
        var tbodyAddressResults = document.createElement("tbody");
        tblAddressResults.appendChild(tbodyAddressResults);
        tblAddressResults.cellSpacing = 0;
        tblAddressResults.cellPadding = 0;

        var validResult = true;
        var searchFields = [];

        var addressFieldValues = responseObject.LocatorSettings.Locators[0].AddressSearch.FilterFieldValues;
        var addressFieldName = responseObject.LocatorSettings.Locators[0].AddressSearch.FilterFieldName;
        var locatorFieldValues = responseObject.LocatorSettings.Locators[0].PlaceNameSearch.FilterFieldValues;
        var locatorFieldName = responseObject.LocatorSettings.Locators[0].PlaceNameSearch.FilterFieldName;

        if (!isAddressSearched) {
            searchFields.push(responseObject.LocatorSettings.Locators[0].PlaceNameSearch.LocatorFieldValue);
        }
        else {
            for (var s in addressFieldValues) {
                if (addressFieldValues.hasOwnProperty(s)) {
                    searchFields.push(addressFieldValues[s]);
                }
            }
        }
        for (var i in candidates) {
            if (candidates.hasOwnProperty(i)) {
                var newExtent = { xmin: candidates[i].attributes.xmin, ymin: candidates[i].attributes.ymin, xmax: candidates[i].attributes.xmax, ymax: candidates[i].attributes.ymax };
                newExtent = CreateExtentForCounty(newExtent);
                if (!isAddressSearched) {
                    if (previousExtent.intersects(newExtent)) {
                        if (dojo.toJson(previousExtent) != dojo.toJson(newExtent)) {
                            GetResultsForLocation(candidates[i], addressFieldName, locatorFieldValues, locatorFieldName, searchFields, tbodyAddressResults)
                        }
                    }
                } else {
                    GetResultsForLocation(candidates[i], addressFieldName, locatorFieldValues, locatorFieldName, searchFields, tbodyAddressResults)
                }
            }
        }
        //Display error message if there are no valid candidate addresses
        if (searchCounter == 0) {
            LocatorErrBack();
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            HideTransparentContainer();
            return;
        }
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        HideTransparentContainer();
        SetAddressResultsHeight();
    } else {
        LocatorErrBack();
    }
}

function GetResultsForLocation(candidates, addressFieldName, locatorFieldValues, locatorFieldName, searchFields, tbodyCandidate) {
    if (candidates.attributes[responseObject.LocatorSettings.Locators[0].AddressMatchScore.Field] > responseObject.LocatorSettings.Locators[0].AddressMatchScore.Value) {
        var locatePoint = new esri.geometry.Point(Number(candidates.location.x), Number(candidates.location.y), map.spatialReference);
        for (var j in searchFields) {
            if (searchFields.hasOwnProperty(j)) {
                if (candidates.attributes[addressFieldName] == searchFields[j]) {
                    if (!isAddressSearched) {
                        if (candidates.attributes[addressFieldName] == responseObject.LocatorSettings.Locators[0].PlaceNameSearch.LocatorFieldValue) {
                            for (var placeField in locatorFieldValues) {
                                if (locatorFieldValues.hasOwnProperty(placeField)) {
                                    if (candidates.attributes[locatorFieldName] != locatorFieldValues[placeField]) {
                                        validResult = false;
                                    }
                                    else {
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
                        searchCounter++;
                        var candidate = candidates;
                        var trCandidate = document.createElement("tr");
                        tbodyCandidate.appendChild(trCandidate);
                        var tdCandidate = document.createElement("td");
                        tdCandidate.innerHTML = dojo.string.substitute(responseObject.LocatorSettings.Locators[0].DisplayField, candidate.attributes);
                        tdCandidate.align = "left";
                        dojo['dom-class'].add(tdCandidate, "bottomBorder cursorPointer");
                        tdCandidate.setAttribute("x", candidate.location.x);
                        tdCandidate.setAttribute("y", candidate.location.y);
                        var ext = { xmin: candidate.attributes.xmin, ymin: candidate.attributes.ymin, xmax: candidate.attributes.xmax, ymax: candidate.attributes.ymax };
                        var candidateExtent = new esri.geometry.Extent(parseFloat(candidate.attributes.xmin), parseFloat(candidate.attributes.ymin), parseFloat(candidate.attributes.xmax), parseFloat(candidate.attributes.ymax), candidate.location.spatialReference);
                        tdCandidate.setAttribute("county", dojo.toJson(ext));
                        tdCandidate.setAttribute("prevExtent", dojo.toJson(candidateExtent));
                        tdCandidate.onclick = function () {
                            if (!isMobileDevice) {
                                map.infoWindow.hide();
                            }
                            mapPoint = new esri.geometry.Point(this.getAttribute("x"), this.getAttribute("y"), map.spatialReference);
                            if (!isAddressSearched) {
                                previousExtent = CreateExtentForCounty(dojo.fromJson(this.getAttribute("prevExtent")));
                                countyExtent = CreateExtentForCounty(dojo.fromJson(this.getAttribute("county")));
                                var locationName = this.innerHTML;
                                geometryService.project([countyExtent], map.spatialReference, function (results) {
                                    if (results.length) {
                                        countyExtent = new esri.geometry.Extent(parseFloat(results[0].xmin), parseFloat(results[0].ymin), parseFloat(results[0].xmax), parseFloat(results[0].ymax), map.spatialReference);
                                        dojo.dom.byId("txtAddress").value = "";
                                        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", "");
                                        ShowLocatedCountyOnMap(countyExtent, locationName);
                                    }
                                });
                            } else {
                                dojo.dom.byId("txtAddress").value = this.innerHTML;
                                dojo.dom.byId('txtAddress').setAttribute("defaultAddress", this.innerHTML);
                                LocateAddressOnMap(mapPoint);
                            }
                            SetAddressResultsHeight();
                        };
                        trCandidate.appendChild(tdCandidate);
                    }
                }
            }
        }
    }
}

function CreateExtentForCounty(ext) {
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

//Locate searched address on map with pushpin graphic

function LocateAddressOnMap(mapPoint) {
    ShowProgressIndicator();
    selectedMapPoint = null;
    featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = point = null;
    map.infoWindow.hide();
    ClearGraphics(tempGraphicsLayerId);
    var bmap = GetBaseMapId();
    if (!map.getLayer(bmap).fullExtent.contains(mapPoint)) {
        map.infoWindow.hide();
        mapPoint = selectedMapPoint = null;
        ClearGraphics(tempGraphicsLayerId);
        HideProgressIndicator();
        alert(messages.getElementsByTagName("noDataAvlbl")[0].childNodes[0].nodeValue);
        return;
    }
    if (mapPoint) {
        map.setLevel(responseObject.ZoomLevel);
        map.centerAt(mapPoint);
        var locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(responseObject.LocatorSettings.DefaultLocatorSymbol, responseObject.LocatorSettings.MarkupSymbolSize.width, responseObject.LocatorSettings.MarkupSymbolSize.height);
        var graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
            "Locator": true
        }, null);
        map.getLayer(tempGraphicsLayerId).add(graphic);
        HideProgressIndicator();
    }
    HideAddressContainer();
}

function GetBaseMapId() {
    if (isWebMap) {
        var bmap = baseMapId;
    } else {
        for (var bMap = 0; bMap < responseObject.BaseMapLayers.length; bMap++) {
            if (responseObject.BaseMapLayers[bMap].MapURL) {
                if (map.getLayer(responseObject.BaseMapLayers[bMap].Key).visible) {
                    var bmap = responseObject.BaseMapLayers[bMap].Key;
                    break;
                }
            }
        }
    }
    return bmap;
}

//Get candidate results for searched location when the 'UseGeocoderService' flag is set to false

function LocateCounty() {
    var currentSearchTime = lastSearchTime = (new Date()).getTime();
    mapPoint = null;
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    ShowTransparentContainer();
    SetAddressResultsHeight();
    if (countyLayerData.ServiceURL) {
        var queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
        var query = new esri.tasks.Query();
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
                FetchCountyResults(featureSet.features);
            } else {
                dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
                RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
                LocatorErrBack();
            }
        }, function (err) {
            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            HideTransparentContainer();
        });
    }
    else {
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        HideTransparentContainer();
    }
}

//Executed when user performs permit search.

function LocatePermitNumber() {
    dojo.dom.byId('txtAddress').setAttribute("defaultPermit", dojo.dom.byId("txtAddress").value);
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    isCountySearched = false;
    permitArray.length = 0;
    mapPoint = null;
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    SetAddressResultsHeight();
    for (index = 0; index < searchSettings.length; index++) {
        FetchPermitResults(searchSettings[index], null, index);
    }
}

//Query the layers to fetch permit results

function FetchPermitResults(layer, polygonGeometry, index) {
    permitArray.length = 0;
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    ShowTransparentContainer();
    var queryTask = new esri.tasks.QueryTask(layer.QueryURL);
    var query = new esri.tasks.Query();
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
        PopulatePermitData(featureSet, layer, index);
    }, function (err) {
        alert(dojo.string.substitute(messages.getElementsByTagName("dataNotFound")[0].childNodes[0].nodeValue, [layer.Title]));
        PopulatePermitData();
    });
}

//Get candidate results for searched permit and store it in an array

function PopulatePermitData(featureSet, layer, index) {
    queryExecutedCount++;
    var currentSearchTime = lastSearchTime = (new Date()).getTime();
    if (currentSearchTime < lastSearchTime) {
        return;
    }
    if (featureSet) {
        if (featureSet.features.length > 0) {
            for (var num = 0; num < featureSet.features.length; num++) {
                FormatNullValues(featureSet.features[num].attributes);
                permitArray.push({
                    attr: featureSet.features[num],
                    fields: featureSet.fields,
                    index: index,
                    layerID: layer
                });
            }
        }
    }
    if (searchSettings.length == queryExecutedCount) {
        if (permitArray.length > 0) {
            queryExecutedCount = 0;
            PopulatePermits(permitArray);
        } else {
            queryExecutedCount = 0;
            LocatorErrBack(messages.getElementsByTagName("noPermitFound")[0].childNodes[0].nodeValue);
            HideProgressIndicator();
        }
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        isPermitNumberSearched = false;
    }
}

//Populate candidate permit list in address container

function PopulatePermits(permitArray) {
    dojo['dom-construct'].empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    var tableAddressResults = dojo.dom.byId("tblAddressResults");
    var tbodyAddressResults = document.createElement("tbody");
    tableAddressResults.appendChild(tbodyAddressResults);
    tableAddressResults.cellSpacing = tableAddressResults.cellPadding = 0;

    var arrPermits = [];
    try {
        for (var i = 0; i < permitArray.length; i++) {
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
        var nameA = a.name.toLowerCase(),
            nameB = b.name.toLowerCase()
        if (nameA < nameB) //sort string ascending
            return -1
        else return 1
    });

    for (var i = 0; i < arrPermits.length; i++) {
        var trPermit = document.createElement("tr");
        tbodyAddressResults.appendChild(trPermit);
        var tdPermit = document.createElement("td");
        tdPermit.innerHTML = arrPermits[i].name;
        tdPermit.align = "left";
        dojo['dom-class'].add(tdPermit, "bottomBorder cursorPointer");
        tdPermit.setAttribute("index", i);
        var defaultPermit = arrPermits[i].attributes.attr.attributes[arrPermits[i].searchDisplayField.split("$")[1].split("{")[1].split("}")[0]];
        tdPermit.setAttribute("defaultPermit", defaultPermit);
        tdPermit.onclick = function () {
            //To check if infowindow data for this layer is accessible from the webmap or not.
            if (arrPermits[this.getAttribute("index")].attributes.layerID.InfoWindowHeader) {
                var counter = 0;
                var layer = arrPermits[this.getAttribute("index")].attributes.layerID.QueryURL;
                for (var i = 0; i < operationalLayers.length; i++) {
                    var lastIndex = operationalLayers[i].ServiceURL.lastIndexOf('/');
                    var dynamicLayerId = operationalLayers[i].ServiceURL.substr(lastIndex + 1);
                    if (isNaN(dynamicLayerId) || dynamicLayerId == "") {
                        counter++;
                    } else {
                        if (operationalLayers[i].ServiceURL == layer) {
                            counter++;
                        }
                    }
                }
                //To check if the queried layer is added on the map or not
                if (counter == 0) {
                    alert(messages.getElementsByTagName("layerNotVisible")[0].childNodes[0].nodeValue);
                } else {
                    FetchPermitData(this, arrPermits);
                }
            }
            else {
                alert(dojo.string.substitute(messages.getElementsByTagName("noInfoWindowData")[0].childNodes[0].nodeValue, [arrPermits[this.getAttribute("index")].attributes.layerID.Title]));
            }
        };
        trPermit.appendChild(tdPermit);
    }
    SetAddressResultsHeight();
}

//Fetch data for the selected permit

function FetchPermitData(permitData, arrPermits) {
    var attributes = arrPermits[permitData.getAttribute("index")].attributes;
    ShowProgressIndicator();
    map.infoWindow.hide();
    if (!isCountySearched) {
        dojo.dom.byId("txtAddress").value = permitData.getAttribute("defaultPermit");
        dojo.dom.byId('txtAddress').setAttribute("defaultPermit", permitData.getAttribute("defaultPermit"));
    } else {
        dojo.dom.byId("txtAddress").value = "";
        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", "");
    }
    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
    for (var i = 0; i < attributes.fields.length; i++) {
        if (attributes.fields[i].type == "esriFieldTypeOID") {
            var objID = attributes.fields[i].name;
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
    var queryTask = new esri.tasks.QueryTask(attributes.layerID.QueryURL);
    var query = new esri.tasks.Query();
    query.where = objID + "=" + searchFeatureID;
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        LocatePermitOnMap(featureSet.features[0].geometry, featureSet.features[0].attributes, attributes.index, featureSet.fields, featureSet.geometryType);
    }, function (err) {
        alert(err.message);
        HideProgressIndicator();
    });
}

//Locate searched permit on map and display the infowindow for the same

function LocatePermitOnMap(mapPoint, attributes, layerID, fields, geometryType) {
    map.getLayer(highlightGraphicsLayerId).clear();
    HideRipple();
    if (geometryType == "esriGeometryPoint") {
        GlowRipple(mapPoint);
    } else {
        var highlightSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
        new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
        new dojo.Color([parseInt(responseObject.HighlightFeaturesSymbology.LineSymbolColor.split(",")[0], 10),
         parseInt(responseObject.HighlightFeaturesSymbology.LineSymbolColor.split(",")[1], 10),
         parseInt(responseObject.HighlightFeaturesSymbology.LineSymbolColor.split(",")[2], 10),
         parseFloat(responseObject.HighlightFeaturesSymbology.LineSymbolTransparency.split(",")[0], 10)]), 2),
        new dojo.Color([parseInt(responseObject.HighlightFeaturesSymbology.FillSymbolColor.split(",")[0], 10),
        parseInt(responseObject.HighlightFeaturesSymbology.FillSymbolColor.split(",")[1], 10),
         parseInt(responseObject.HighlightFeaturesSymbology.FillSymbolColor.split(",")[2], 10),
         parseFloat(responseObject.HighlightFeaturesSymbology.FillSymbolTransparency.split(",")[0], 10)]));
        var highlightGraphic = new esri.Graphic(mapPoint, highlightSymbol);
        var features = [];
        features.push(highlightGraphic);
        var featureSet = new esri.tasks.FeatureSet();
        featureSet.features = features;
        map.getLayer(highlightGraphicsLayerId).add(featureSet.features[0]);
    }
    if (!isMobileDevice) {
        if (mapPoint) {
            ShowInfoWindowDetails(mapPoint, attributes, null, layerID, null, fields);
        }
        if (dojo['dom-geometry'].getMarginBox("divAddressContent").h > 0) {
            dojo['dom-class'].replace("divAddressContent", "hideContainerHeight", "showContainerHeight");
            dojo.dom.byId('divAddressContent').style.height = '0px';
        }
    } else {
        if (mapPoint) {
            ShowMobileInfoWindow(mapPoint, attributes, layerID, fields);
        }
        HideAddressContainer();
    }
}

//Show ripple for point feature on address search

function GlowRipple(mapPoint) {
    HideRipple();
    var layer = map.getLayer(highlightPointGraphicsLayerId);
    var rippleSize = responseObject.HighlightFeaturesSymbology.MarkerSymbolSize;
    var rippleColor = [parseInt(responseObject.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[0], 10), parseInt(responseObject.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[1], 10), parseInt(responseObject.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[2], 10), parseFloat(responseObject.HighlightFeaturesSymbology.MarkerSymbolTransparency.split(",")[0], 10)];
    var i = rippleSize;
    var flag = true;
    var intervalID = setInterval(function () {
        layer.clear();
        if (i == rippleSize) {
            flag = false;
        } else if (i == (rippleSize - 4)) {
            flag = true;
        }
        var symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, (i - 1) * 2,
        new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
        new dojo.Color(rippleColor), 6),
        new dojo.Color([0, 0, 0, 0])).setOffset(0, -4);

        var highlightGraphic = new esri.Graphic(mapPoint, symbol, null, null);
        var features = [];
        features.push(highlightGraphic);
        var featureSet = new esri.tasks.FeatureSet();
        featureSet.features = features;
        layer.add(featureSet.features[0]);
        if (flag) i++;
        else i--;
    }, 100);
    intervalIDs[intervalIDs.length] = intervalID;
}

function HideRipple() {
    ClearAllIntervals();
    map.getLayer(highlightPointGraphicsLayerId).clear();
}

function ClearAllIntervals() {
    for (var i = 0; i < intervalIDs.length; i++) {
        clearInterval(intervalIDs[i]);
        delete intervalIDs[i];
    }
    intervalIDs.length = 0;
}

//Populate candidate location list in address container on location search

function FetchCountyResults(featureset) {
    var currentSearchTime = lastSearchTime = (new Date()).getTime();
    if (currentSearchTime < lastSearchTime) {
        return;
    }
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    if (featureset.length > 0) {
        if (dojo.byId("txtAddress").value != "") {
            var tableCounty = dojo.byId("tblAddressResults");
            var tbodyCounty = document.createElement("tbody");
            tableCounty.appendChild(tbodyCounty);
            tableCounty.cellSpacing = tableCounty.cellPadding = 0;
            var featureSet = [];
            try {
                for (var i = 0; i < featureset.length; i++) {
                    featureSet.push({
                        attributes: featureset[i].attributes,
                        name: dojo.string.substitute(countyLayerData.CountyDisplayField, featureset[i].attributes)
                    });
                }
            } catch (e) {
                alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
            }

            featureSet.sort(function (a, b) {
                var nameA = a.name.toLowerCase(),
                    nameB = b.name.toLowerCase();
                if (nameA < nameB) //sort string ascending
                    return -1
                else return 1
            });

            for (var i = 0; i < featureSet.length; i++) {
                var trCounty = document.createElement("tr");
                tbodyCounty.appendChild(trCounty);
                var tdCounty = document.createElement("td");
                tdCounty.innerHTML = dojo.string.substitute(countyLayerData.CountyDisplayField, featureSet[i].attributes);
                tdCounty.align = "left";
                dojo['dom-class'].add(tdCounty, "bottomBorder cursorPointer");
                tdCounty.setAttribute("index", i);
                tdCounty.onclick = function () {
                    map.infoWindow.hide();
                    dojo.dom.byId("txtAddress").value = this.innerHTML;
                    dojo.dom.byId('txtAddress').setAttribute("defaultLocation", this.innerHTML);
                    lastSearchString = dojo.string.trim(dojo.dom.byId("txtAddress").value);
                    var attr = featureSet[this.getAttribute("index")].attributes;
                    LocateCountyOnMap();
                };
                trCounty.appendChild(tdCounty);
            }
            isCountySearched = false;
            SetAddressResultsHeight();
        }
    } else {
        LocatorErrBack();
    }
}

//Display error message when locator service fails or does not return any data

function LocatorErrBack(errorMessage) {
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    var tableErrorMsg = dojo.dom.byId("tblAddressResults");
    var tbodyErrorMsg = document.createElement("tbody");
    tableErrorMsg.appendChild(tbodyErrorMsg);
    tableErrorMsg.cellSpacing = 0;
    tableErrorMsg.cellPadding = 0;
    var trErrorMsg = document.createElement("tr");
    tbodyErrorMsg.appendChild(trErrorMsg);
    var tdErrorMsg = document.createElement("td");
    tdErrorMsg.innerHTML = errorMessage ? errorMessage : messages.getElementsByTagName("invalidSearch")[0].childNodes[0].nodeValue;
    tdErrorMsg.align = "left";
    dojo['dom-class'].add(tdErrorMsg, "bottomBorder");
    tdErrorMsg.style.cursor = "default";
    trErrorMsg.appendChild(tdErrorMsg);
}

//Query the location that is selected from the list of candidates to fetch its geometry

function LocateCountyOnMap() {
    isCountySearched = true;
    permitArray = [];
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    var queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
    var query = new esri.tasks.Query();
    query.where = dojo.string.substitute(countyLayerData.SearchExpression, [dojo.string.trim(dojo.dom.byId("txtAddress").value).toUpperCase()]);
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
        ShowLocatedCountyOnMap(featureSet.features[0].geometry, dojo.string.trim(dojo.dom.byId("txtAddress").value));
    });
}

//Locate selected location on map and add it to the breadcrumbs

function ShowLocatedCountyOnMap(geometry, locationName) {
    if (!isMobileDevice) {
        ShowProgressIndicator();
    } else {
        dojo.dom.byId("imgSearchLoader").style.display = "block";
        ShowTransparentContainer();
    }
    isCountySearched = true;

    if (geometry) {
        countyGeometry = geometry.getExtent();
        map.setExtent(countyGeometry, true);
        HideProgressIndicator();
    }
    for (var index = 0; index < searchSettings.length; index++) {
        FetchPermitResults(searchSettings[index], geometry, index);
    }
    if (locationName) {
        dojo.dom.byId("divBreadCrumbs").style.display = "block";
        span = document.createElement("span");
        dojo.dom.byId("tdBreadCrumbs").appendChild(span);
        var ext = { xmin: countyGeometry.xmin, ymin: countyGeometry.ymin, xmax: countyGeometry.xmax, ymax: countyGeometry.ymax };
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
            SetAddressResultsHeight();
        }
        span.onclick = function () {
            NavigateBreadCrumbs(this);
        };
    }
}

//Navigate through the breadcrumbs.

function NavigateBreadCrumbs(pThis) {
    var county = dojo.fromJson(pThis.getAttribute("county"));
    if (!responseObject.CountyLayerData.UseGeocoderService) {
        var polygon = new esri.geometry.Polygon(map.spatialReference);
        polygon.addRing(dojo.fromJson(pThis.getAttribute("countyGeometry")).rings[0]);
    }
    countyGeometry = new esri.geometry.Extent(parseFloat(county.xmin), parseFloat(county.ymin), parseFloat(county.xmax), parseFloat(county.ymax), map.spatialReference);
    map.setExtent(countyGeometry, true);
    previousExtent = countyGeometry;
    for (var index = 0; index < searchSettings.length; index++) {
        if (responseObject.CountyLayerData.UseGeocoderService) {
            FetchPermitResults(searchSettings[index], countyGeometry, index);
        } else {
            FetchPermitResults(searchSettings[index], polygon, index);
        }
    }
    var list = dojo.dom.byId("tdBreadCrumbs");
    items = list.getElementsByTagName("span");
    var itemsLength = items.length;
    if (items.length) {
        for (var i = itemsLength - 1; i >= 0; i--) {
            if (i > pThis.getAttribute("index")) {
                dojo.destroy(items[i]);
            }
        }
    }
}

//Clear breadcrumbs container and clear the previously searched results

function ClearBreadCrumbs() {
    dojo.dom.byId("divBreadCrumbs").style.display = "none";
    dojo.dom.byId("tdBreadCrumbs").innerHTML = "";
    queryExecutedCount = 0;
    countyGeometry = null;
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    isCountySearched = false;
}

//Display the current location of the user and a pushpin at that location

function ShowMyLocation() {
    ClearGraphics(tempGraphicsLayerId);
    HideBaseMapLayerContainer();
    HideShareAppContainer();
    HideAddressContainer();
    var cTimeout = 8000 /* ms */,
        cBackupTimeout = 16000
    backupTimeoutTimer = setTimeout(function () {
        alert(messages.getElementsByTagName("geolocationPositionUnavailable")[0].childNodes[0].nodeValue);
    }, cBackupTimeout);

    navigator.geolocation.getCurrentPosition(function (position) {
        clearTimeout(backupTimeoutTimer);
        ShowProgressIndicator();
        mapPoint = new esri.geometry.Point(position.coords.longitude, position.coords.latitude, new esri.SpatialReference({
            wkid: 4326
        }));
        var graphicCollection = new esri.geometry.Multipoint(new esri.SpatialReference({
            wkid: 4326
        }));
        graphicCollection.addPoint(mapPoint);
        map.infoWindow.hide();
        geometryService.project([graphicCollection], map.spatialReference, function (newPointCollection) {
            var bmap = GetBaseMapId();
            if (!map.getLayer(bmap).fullExtent.contains(newPointCollection[0].getPoint(0))) {
                mapPoint = selectedMapPoint = null;
                ClearGraphics(tempGraphicsLayerId);
                map.infoWindow.hide();
                HideProgressIndicator();
                alert(messages.getElementsByTagName("geoLocation")[0].childNodes[0].nodeValue);
                return;
            }
            selectedMapPoint = null;
            featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = null;
            map.infoWindow.hide();
            mapPoint = newPointCollection[0].getPoint(0);
            map.setLevel(responseObject.ZoomLevel);
            map.centerAt(mapPoint);
            var locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(responseObject.LocatorSettings.DefaultLocatorSymbol, responseObject.LocatorSettings.MarkupSymbolSize.width, responseObject.LocatorSettings.MarkupSymbolSize.height);
            var graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
                "Locator": true
            }, null);
            map.getLayer(tempGraphicsLayerId).add(graphic);
            HideProgressIndicator();
        }, function (error) {
            alert(error.message);
            HideProgressIndicator();
        });
    },
        function (error) {
            clearTimeout(backupTimeoutTimer);
            HideProgressIndicator();
            GeolocationErrorHandler(error);
        }, {
            timeout: cTimeout
        });
}

//Handles errors during geolocation (locate the current location of the user)

function GeolocationErrorHandler(error) {
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

//Query the features for sharing infowindow when user searches for a permit and locates it on the map

function ShareInfoWindow() {
    ShowProgressIndicator();
    for (var index = 0; index < searchSettings.length; index++) {
        if (searchSettings[index].Title == searchInfoWindowLayerID && searchSettings[index].QueryLayerId == searchQueryLayerID) {
            var layerIndex = index;
            var queryTask = new esri.tasks.QueryTask(searchSettings[index].QueryURL);
            esri.request({
                url: searchSettings[index].QueryURL + "?f=json",
                load: function (data) {
                    for (var p = 0; p < data.fields.length; p++) {
                        if (data.fields[p].type == "esriFieldTypeOID") {
                            var objID = data.fields[p].name;
                            break;
                        }
                    }
                    var query = new esri.tasks.Query();
                    query.where = objID + "=" + searchFeatureID;
                    query.outFields = ["*"];
                    query.outSpatialReference = map.spatialReference;
                    query.returnGeometry = true;
                    queryTask.execute(query, function (features) {
                        FormatNullValues(features.features[0].attributes);
                        if (!isMobileDevice) {
                            ShowInfoWindowDetails(features.features[0].geometry, features.features[0].attributes, null, layerIndex, null, features.fields);
                        } else {
                            ShowMobileInfoWindow(features.features[0].geometry, features.features[0].attributes, layerIndex, features.fields);
                        }
                    });
                },
                error: function (err) {
                    alert(err.message);
                }
            });
            break;
        }
    }
    HideProgressIndicator();
}
