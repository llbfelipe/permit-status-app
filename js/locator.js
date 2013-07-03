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

var isAddressSearched;
var permitLayerCounter = 0;
var queryExecutedCount = 0;
var permitArray = [];
var countyGeometry;
var addressSearchFlag = false;
var isPermitNumberSearched = false;

//Locate address
function Locate() {
    if (dojo.byId("tdSearchAddress").className.trim() == "tdSearchByAddress") {
        dojo.empty(dojo.byId('tblAddressResults'));
        RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
        if (dojo.byId("txtAddress").value.trim() == '') {
            dojo.byId("imgSearchLoader").style.display = "none";
            dojo.empty(dojo.byId('tblAddressResults'));
            RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
            if (dojo.byId("txtAddress").value != "") {
                alert(messages.getElementsByTagName("addressToLocate")[0].childNodes[0].nodeValue);
            }
            return;
        } else {
            isAddressSearched = true;
            GetLocation();
        }
    }
    if (dojo.byId("tdSearchLocation").className == "tdSearchByLocation") {
        if (dojo.byId('txtAddress').value.trim() == '') {
            dojo.byId("imgSearchLoader").style.display = "none";
            dojo.empty(dojo.byId('tblAddressResults'));
            RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
            if (dojo.byId("txtAddress").value != "") {
                alert(messages.getElementsByTagName("countyToLocate")[0].childNodes[0].nodeValue);
            }
            return;
        } else if (countyLayerData.UseGeocoderService) {
            isAddressSearched = false;
            GetLocation();
        } else {
            isAddressSearched = false;
            LocateCounty();
        }
    } else if (dojo.byId("tdSearchPermit").className == "tdSearchByPermit") {
        if (dojo.byId('txtAddress').value.trim() == '') {
            dojo.byId("imgSearchLoader").style.display = "none";
            dojo.empty(dojo.byId('tblAddressResults'));
            RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
            if (dojo.byId("txtAddress").value != "") {
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

//Get candidate results for searched address/location
function GetLocation() {
    permitArray = [];
    dojo.byId("imgSearchLoader").style.display = "block";
    var thisSearchTime = lastSearchTime = (new Date()).getTime();
    var address = [];
    SetAddressResultsHeight();
    var locator = new esri.tasks.Locator(locatorSettings.Locators[0].LocatorURL);
    locator.outSpatialReference = map.spatialReference;

    var params = {};
    var searchExtent;
    if (!isAddressSearched) {
        if (!countyGeometry) {
            for (var bMap = 0; bMap < baseMapLayers.length; bMap++) {
                if (map.getLayer(baseMapLayers[bMap].Key).visible) {
                    searchExtent = map.getLayer(baseMapLayers[bMap].Key).fullExtent;
                }
            }
        } else {
            searchExtent = countyGeometry;
        }
    } else {
        for (var bMap = 0; bMap < baseMapLayers.length; bMap++) {
            if (map.getLayer(baseMapLayers[bMap].Key).visible) {
                searchExtent = map.getLayer(baseMapLayers[bMap].Key).fullExtent;
            }
        }
    }

    params["f"] = "json";
    params[locatorSettings.Locators[0].LocatorParamaters.SearchField] = dojo.byId('txtAddress').value;
    params[locatorSettings.Locators[0].LocatorParamaters.SpatialReferenceField] = ((map.spatialReference.wkid) ? ("{wkid:" + map.spatialReference.wkid + "}") : ("{wkt:" + map.spatialReference.wkt + "}"));
    params[locatorSettings.Locators[0].LocatorParamaters.SearchResultField] = locatorSettings.Locators[0].CandidateFields;
    params[locatorSettings.Locators[0].LocatorParamaters.SearchCountField] = locatorSettings.Locators[0].MaxResults;
    params[locatorSettings.Locators[0].LocatorParamaters.SearchBoundaryField] = dojo.toJson(searchExtent);
    esri.request({
        url: locatorSettings.Locators[0].LocatorURL,
        content: params,
        callbackParamName: "callback",
        load: function (candidates) {
            // Discard searches made obsolete by new typing from user
            if (thisSearchTime < lastSearchTime) {
                return;
            }
            if (candidates.locations.length > 0) {
                if (searchExtent.xmin.toFixed(2) == candidates.locations[0].extent.xmin.toFixed(2) && searchExtent.xmax.toFixed(2) == candidates.locations[0].extent.xmax.toFixed(2) && searchExtent.ymin.toFixed(2) == candidates.locations[0].extent.ymin.toFixed(2) && searchExtent.ymax.toFixed(2) == candidates.locations[0].extent.ymax.toFixed(2)) {
                    LocatorErrBack();
                } else {
                    ShowLocation(candidates.locations);
                }
            } else {
                LocatorErrBack();
            }
        },
        error: function (err) {
            dojo.byId("imgSearchLoader").style.display = "none";
            LocatorErrBack(err.message);
            HideProgressIndicator();
        }
    });
}

//Populate candidate address list in address container
function ShowLocation(candidates) {
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    var fieldValues = isAddressSearched ? locatorSettings.Locators[0].LocatorFieldValues : locatorSettings.Locators[0].CountyFields.Value;
    var fieldName = isAddressSearched ? locatorSettings.Locators[0].LocatorFieldName : locatorSettings.Locators[0].CountyFields.FieldName;
    if (candidates.length > 0) {
        var table = dojo.byId("tblAddressResults");
        var tBody = document.createElement("tbody");
        table.appendChild(tBody);
        table.cellSpacing = 0;
        table.cellPadding = 0;
        var candidatesLength = false;
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            for (j in fieldValues) {
                if ((candidate.feature.attributes[fieldName].toUpperCase() == fieldValues[j].toUpperCase()) && (candidate.feature.attributes[locatorSettings.Locators[0].AddressMatchScore.Field] > locatorSettings.Locators[0].AddressMatchScore.Value)) {
                    var tr = document.createElement("tr");
                    tBody.appendChild(tr);
                    var td1 = document.createElement("td");
                    td1.innerHTML = candidate.name;
                    td1.align = "left";
                    td1.className = 'bottomborder';
                    td1.style.cursor = "pointer";
                    td1.setAttribute("x", candidate.feature.geometry.x);
                    td1.setAttribute("y", candidate.feature.geometry.y);
                    td1.setAttribute("countyExtentxmin", candidates[i].extent.xmin);
                    td1.setAttribute("countyExtentymin", candidates[i].extent.ymin);
                    td1.setAttribute("countyExtentxmax", candidates[i].extent.xmax);
                    td1.setAttribute("countyExtentymax", candidates[i].extent.ymax);
                    td1.onclick = function () {
                        if (!isMobileDevice) {
                            map.infoWindow.hide();
                        }
                        mapPoint = new esri.geometry.Point(this.getAttribute("x"), this.getAttribute("y"), map.spatialReference);

                        if (!isAddressSearched) {
                            var countyExtent = new esri.geometry.Extent(parseFloat(this.getAttribute("countyExtentxmin")), parseFloat(this.getAttribute("countyExtentymin")), parseFloat(this.getAttribute("countyExtentxmax")), parseFloat(this.getAttribute("countyExtentymax")), map.spatialReference);
                            dojo.byId("txtAddress").value = this.innerHTML;
                            dojo.byId('txtAddress').setAttribute("defaultLocation", this.innerHTML);
                            ShowLocatedCountyOnMap(countyExtent, this.innerHTML)
                        } else {
                            dojo.byId("txtAddress").value = this.innerHTML;
                            dojo.byId('txtAddress').setAttribute("defaultAddress", this.innerHTML);
                            LocateAddressOnMap(mapPoint);
                        }
                        SetAddressResultsHeight();
                    }
                    tr.appendChild(td1);
                    candidatesLength = true;
                }
            }
            dojo.byId("imgSearchLoader").style.display = "none";
        }
        if (!candidatesLength) {
            LocatorErrBack();
        }
        SetAddressResultsHeight();
    } else {
        LocatorErrBack();
    }
}

//Locate searched address on map with pushpin graphic
function LocateAddressOnMap(mapPoint) {
    ShowProgressIndicator();
    selectedMapPoint = null;
    map.infoWindow.hide();
    ClearGraphics();
    for (var bMap = 0; bMap < baseMapLayers.length; bMap++) {
        if (map.getLayer(baseMapLayers[bMap].Key).visible) {
            var bmap = baseMapLayers[bMap].Key;
        }
    }
    if (!map.getLayer(bmap).fullExtent.contains(mapPoint)) {
        map.infoWindow.hide();
        mapPoint = selectedMapPoint = null;
        map.getLayer(tempGraphicsLayerId).clear();
        HideProgressIndicator();
        alert(messages.getElementsByTagName("noDataAvlbl")[0].childNodes[0].nodeValue);
        return;
    }
    if (mapPoint) {
        map.setLevel(locatorSettings.Locators[0].ZoomLevel);
        map.centerAt(mapPoint);
        var locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(locatorSettings.DefaultLocatorSymbol, locatorSettings.MarkupSymbolSize.width, locatorSettings.MarkupSymbolSize.height);
        var graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
            "Locator": true
        }, null);
        map.getLayer(tempGraphicsLayerId).add(graphic);
        HideProgressIndicator();
    }
    HideAddressContainer();
}

//Get candidate results for searched county
function LocateCounty() {
    var thisSearchTime = lastSearchTime = (new Date()).getTime();
    mapPoint = null;
    dojo.byId("imgSearchLoader").style.display = "block";
    SetAddressResultsHeight();

    var queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
    var query = new esri.tasks.Query();
    query.where = dojo.string.substitute(countyLayerData.SearchQuery, [dojo.byId("txtAddress").value.trim().toUpperCase()]);
    if (isCountySearched) {
        query.geometry = countyGeometry;
        query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_WITHIN;
    }
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = false;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        if (thisSearchTime < lastSearchTime) {
            return;
        }
        if (featureSet.features.length > 0) {
            FetchCountyResults(featureSet.features);
        } else {
            dojo.empty(dojo.byId('tblAddressResults'));
            RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
            LocatorErrBack();
        }
    });
}

//Get candidate results for searched permit
function LocatePermitNumber() {
    isCountySearched = false;
    permitArray = [];
    mapPoint = null;
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    SetAddressResultsHeight();

    for (var index in permitResultData) {
        permitLayerCounter++;
        FetchPermitResults(permitResultData[index], null, index);
    }
}

//Query a layer to fetch permit data
function FetchPermitResults(layer, polygonGeometry, index) {
    permitArray = [];
    dojo.byId("imgSearchLoader").style.display = "block";
    var queryTask = new esri.tasks.QueryTask(layer.ServiceURL);
    var query = new esri.tasks.Query();
    if (!isCountySearched) {
        query.where = dojo.string.substitute(layer.SearchQuery, [dojo.byId("txtAddress").value.trim().toUpperCase()]);
    } else {
        query.geometry = polygonGeometry;
        query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
    }
    var permitType;
    layer.PermitType.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, function (match, key) {
        permitType = key;
    });
    query.groupByFieldsForStatistics = [permitType];
    var permitNumber;
    layer.SearchField.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, function (match, key) {
        permitNumber = key;
    });
    var statisticDefinition = new esri.tasks.StatisticDefinition();
    statisticDefinition.statisticType = "count";
    statisticDefinition.onStatisticField = permitNumber;
    statisticDefinition.outStatisticFieldName = "TotalCount";

    query.outStatistics = [statisticDefinition];
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = false;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        queryExecutedCount++;
        for (var num in featureSet.features) {
            for (var j in featureSet.features[num].attributes) {
                if (!featureSet.features[num].attributes[j]) {
                    featureSet.features[num].attributes[j] = showNullValueAs;
                }
            }
            permitArray.push({
                attr: featureSet.features[num],
                name: dojo.string.substitute(layer.PermitType, featureSet.features[num].attributes),
                index: index,
                layerID: layer
            });
        }

        permitArray.sort(function (a, b) {
            var nameA = a.name.toLowerCase(),
                nameB = b.name.toLowerCase()
            if (nameA < nameB) //sort string ascending
                return -1
            else return 1
        });
        if (permitLayerCounter == queryExecutedCount) {
            if (permitArray.length > 0) {
                PopulatePermitsInGroup(permitArray);
            } else {
                LocatorErrBack(messages.getElementsByTagName("noPermitFound")[0].childNodes[0].nodeValue);
                HideProgressIndicator();
            }
            dojo.byId("imgSearchLoader").style.display = "none";
            isPermitNumberSearched = false;
        }
    });
}

//Categorize permits in respective groups
function PopulatePermitsInGroup(arrPermitTypes) {
    dojo.empty(dojo.byId('tblAddressResults'));
    var table = dojo.byId("tblAddressResults");
    var tBody = document.createElement("tbody");
    table.appendChild(tBody);

    var groupArray = [];
    for (var p = 0; p < arrPermitTypes.length; p++) {
        if (groupArray[arrPermitTypes[p].name]) {
            groupArray[arrPermitTypes[p].name].push(p);
        } else {
            groupArray[arrPermitTypes[p].name] = [];
            groupArray[arrPermitTypes[p].name].push(p);
        }
    }

    for (var q in groupArray) {
        if (groupArray[q].length > 1) {
            for (var r in groupArray[q]) {
                arrPermitTypes[groupArray[q][r]]["group"] = [];
                arrPermitTypes[groupArray[q][r]]["group"] = true;
            }
        }
    }

    for (var permitType in arrPermitTypes) {
        if (arrPermitTypes.length > 0) {
            var tr = document.createElement("tr");
            tBody.appendChild(tr);
            var tdPermitType = document.createElement("td");
            tr.appendChild(tdPermitType);
            for (var j in arrPermitTypes[permitType].attr.attributes) {
                if (!arrPermitTypes[permitType].attr.attributes[j]) {
                    arrPermitTypes[permitType].attr.attributes[j] = showNullValueAs;
                }
            }

            if (arrPermitTypes[permitType].group) {
                pType = dojo.string.substitute(arrPermitTypes[permitType].layerID.PermitType, arrPermitTypes[permitType].attr.attributes) + "-" + arrPermitTypes[permitType].index;
            } else {
                pType = dojo.string.substitute(arrPermitTypes[permitType].layerID.PermitType, arrPermitTypes[permitType].attr.attributes);
            }

            tr.setAttribute("permitType", dojo.string.substitute(arrPermitTypes[permitType].layerID.PermitType, arrPermitTypes[permitType].attr.attributes));

            tr.setAttribute("layerURL", arrPermitTypes[permitType].layerID.ServiceURL);
            tr.setAttribute("layerKey", arrPermitTypes[permitType].index);
            tr.setAttribute("pType", permitType);

            var tNode = document.createTextNode(pType + " (" + arrPermitTypes[permitType].attr.attributes.TotalCount + ")");

            var permitTypeField;
            arrPermitTypes[permitType].layerID.PermitType.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, function (match, key) {
                permitTypeField = key;
            });
            tr.setAttribute("permitTypeField", permitTypeField);
            tr.setAttribute("layerSearchQuery", arrPermitTypes[permitType].layerID.SearchQuery);
            tr.setAttribute("layerSearchField", arrPermitTypes[permitType].layerID.SearchField);
            tdPermitType.appendChild(tNode);
            tdPermitType.className = 'bottomborder';
            tdPermitType.style.cursor = "pointer";

            var tbl = document.createElement("table");
            tdPermitType.appendChild(tbl);
            var tBodySub = document.createElement("tbody");
            tBodySub.setAttribute("tbodyPermitType", dojo.string.substitute(arrPermitTypes[permitType].layerID.PermitType, arrPermitTypes[permitType].attr.attributes));
            tBodySub.setAttribute("tbodyLayerKey", arrPermitTypes[permitType].index);
            tBodySub.id = "tbody" + tBodySub.getAttribute("tbodyLayerKey") + tBodySub.getAttribute("tbodyPermitType");
            tbl.appendChild(tBodySub);

            tbl.setAttribute("tblPermitType", dojo.string.substitute(arrPermitTypes[permitType].layerID.PermitType, arrPermitTypes[permitType].attr.attributes));
            tbl.setAttribute("tblLayerKey", arrPermitTypes[permitType].index);
            tbl.id = "tbl" + tbl.getAttribute("tblLayerKey") + tbl.getAttribute("tblPermitType");
            tbl.style.display = 'none';
            tbl.cellSpacing = tbl.cellPadding = 0;

            tr.onclick = function () {
                ShowSubAddressList(this, arrPermitTypes);
            }
        }
    }
    dojo.byId("imgSearchLoader").style.display = "none";
    SetAddressResultsHeight();
    HideProgressIndicator();
}

//Display list of permits which fall within a particular type
function ShowSubAddressList(trThis, arrPermitTypes) {
    var topPos = dojo.coords(dojo.byId('divAddressScrollContainerscrollbar_handle')).t;
    dojo.byId("imgSearchLoader").style.display = "block";
    var _this = trThis;
    var typ = trThis.getAttribute("permitType");
    var tblType = trThis.getAttribute("layerKey") + trThis.getAttribute("permitType");
    if (dojo.byId("tbl" + tblType).style.display == 'none') {
        dojo.empty(dojo.byId("tbody" + tblType));
        var queryTask = new esri.tasks.QueryTask(trThis.getAttribute("layerURL"));
        var query = new esri.tasks.Query();
        if (trThis.getAttribute("permitType") == showNullValueAs) {
            query.where = trThis.getAttribute("permitTypeField") + " IS NULL" + " AND (" + dojo.string.substitute(trThis.getAttribute("layerSearchQuery"), [dojo.byId("txtAddress").value.trim().toUpperCase()]) + ")";
        } else if (isCountySearched) {
            query.where = trThis.getAttribute("permitTypeField") + " = " + "'" + trThis.getAttribute("permitType") + "'";
            query.geometry = countyGeometry;
            query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
        } else {
            query.where = trThis.getAttribute("permitTypeField") + " = " + "'" + trThis.getAttribute("permitType") + "'" + " AND (" + dojo.string.substitute(trThis.getAttribute("layerSearchQuery"), [dojo.byId("txtAddress").value.trim().toUpperCase()]) + ")";
        }
        query.outSpatialReference = map.spatialReference;
        query.returnGeometry = false;
        query.outFields = ["*"];
        queryTask.execute(query, function (featureSet) {
            for (var index in featureSet.features) {
                var tr2 = document.createElement("tr");
                dojo.byId("tbody" + tblType).appendChild(tr2);
                var td2 = document.createElement("td");
                tr2.appendChild(td2);
                td2.id = _this.getAttribute("permitType") + '-' + index;
                td2.className = 'tdSubAddress';
                if (isMobileDevice) {
                    td2.style.width = (dojo.window.getBox().w - 50) + "px";
                }
                td2.innerHTML = dojo.string.substitute(_this.getAttribute("layerSearchField"), featureSet.features[index].attributes);
                td2.title = 'Click to Locate';
                td2.setAttribute("layerQueryURL", _this.getAttribute("layerURL"));
                td2.setAttribute("layerSearchQuery", _this.getAttribute("layerSearchQuery"));
                td2.onclick = function (evt) { //on-click function for address list
                    ShowProgressIndicator();
                    map.infoWindow.hide();
                    HideAddressContainer();
                    dojo.byId("txtAddress").value = this.innerHTML;
                    if (isCountySearched) {
                        dojo.byId('txtAddress').setAttribute("defaultLocation", this.innerHTML);
                    } else {
                        dojo.byId('txtAddress').setAttribute("defaultPermit", this.innerHTML);
                    }
                    lastSearchString = dojo.byId("txtAddress").value.trim();
                    var queryTask = new esri.tasks.QueryTask(this.getAttribute("layerQueryURL"));
                    var query = new esri.tasks.Query();
                    query.where = dojo.string.substitute(this.getAttribute("layerSearchQuery"), [this.innerHTML.trim().toUpperCase()]);
                    query.outSpatialReference = map.spatialReference;
                    query.returnGeometry = true;
                    query.outFields = ["*"];
                    queryTask.execute(query, function (featureSet) {
                        searchFeatureID = featureSet.features[0].attributes[shareQuery.split("${0}")[0].split(" =")[0]];
                        searchInfoWindowLayerID = arrPermitTypes[_this.getAttribute('pType')].index;
                        addressSearchFlag = true;
                        var permitGeometry = featureSet.features[0].geometry;
                        if (permitGeometry.type == 'polygon') {
                            var mapPoint = permitGeometry.getExtent().getCenter();
                        } else {
                            var mapPoint = new esri.geometry.Point(Number(permitGeometry.x), Number(permitGeometry.y), map.spatialReference);
                        }
                        LocatePermitOnMap(mapPoint, featureSet.features[0].attributes, arrPermitTypes[_this.getAttribute('pType')].layerID, featureSet.fields);
                        setTimeout(function () {
                            HideProgressIndicator();
                        }, 500);
                    });
                }
            }
            ToggleGroupDisplay(tblType);
            SetAddressResultsHeight();
            dojo.byId("imgSearchLoader").style.display = "none";
            dojo.byId('divAddressScrollContainerscrollbar_handle').style.top = '0px';
            if (topPos > 5) {
                dojo.byId('divAddressScrollContainerscrollbar_handle').style.top = (topPos - 5) + 'px';
            } else {
                dojo.byId('divAddressScrollContainerscrollbar_handle').style.top = topPos + "px";
            }

            var topPos = dojo.coords(dojo.byId('divAddressScrollContainerscrollbar_handle')).t;
            dojo.byId('divAddressScrollContainerscrollbar_handle').style.top = topPos + 'px';
        });

    } else {
        ToggleGroupDisplay(tblType);
        SetAddressResultsHeight();
        dojo.byId("imgSearchLoader").style.display = "none";
    }
}

//Expand/collapse group in permit search results
function ToggleGroupDisplay(permitType) {
    var table = dojo.byId("tbl" + permitType);
    if (table.style.display == "none") {
        table.style.display = "block";
    } else {
        table.style.display = "none";
    }
}

//Populate candidate county list in address container
function FetchCountyResults(featureset) {
    var thisSearchTime = lastSearchTime = (new Date()).getTime();
    if (thisSearchTime < lastSearchTime) {
        return;
    }
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    dojo.byId("imgSearchLoader").style.display = "none";
    if (featureset.length > 0) {
        var table = dojo.byId("tblAddressResults");
        var tBody = document.createElement("tbody");
        table.appendChild(tBody);
        table.cellSpacing = 0;
        table.cellPadding = 0;
        var featureSet = [];
        for (var i = 0; i < featureset.length; i++) {
            featureSet.push({
                attributes: featureset[i].attributes,
                name: dojo.string.substitute(countyLayerData.CountyDisplayField, featureset[i].attributes)
            });
        }

        featureSet.sort(function (a, b) {
            var nameA = a.name.toLowerCase(),
                nameB = b.name.toLowerCase()
            if (nameA < nameB) //sort string ascending
                return -1
            else return 1
        });

        for (var i = 0; i < featureSet.length; i++) {
            var tr = document.createElement("tr");
            tBody.appendChild(tr);
            var td1 = document.createElement("td");
            td1.innerHTML = dojo.string.substitute(countyLayerData.CountyDisplayField, featureset[i].attributes);
            td1.align = "left";
            td1.className = 'bottomborder';
            td1.style.cursor = "pointer";
            td1.setAttribute("index", i);
            td1.onclick = function () {
                map.infoWindow.hide();
                dojo.byId("txtAddress").value = this.innerHTML;
                dojo.byId('txtAddress').setAttribute("defaultLocation", this.innerHTML);
                lastSearchString = dojo.byId("txtAddress").value.trim();
                var attr = featureSet[this.getAttribute("index")].attributes;
                LocateCountyOnMap(attr);
            }
            tr.appendChild(td1);
        }
        SetAddressResultsHeight();
        isCountySearched = false;
        SetAddressResultsHeight();
    } else {
        LocatorErrBack();
    }
}

//Display error message when locator service fails or does not return any data
function LocatorErrBack(errorMessage) {
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    dojo.byId("imgSearchLoader").style.display = "none";
    var table = dojo.byId("tblAddressResults");
    var tBody = document.createElement("tbody");
    table.appendChild(tBody);
    table.cellSpacing = 0;
    table.cellPadding = 0;
    var tr = document.createElement("tr");
    tBody.appendChild(tr);
    var td = document.createElement("td");
    td.innerHTML = errorMessage ? errorMessage : messages.getElementsByTagName("invalidSearch")[0].childNodes[0].nodeValue;
    td.align = "left";
    td.className = 'bottomborder';
    td.style.cursor = "default";
    tr.appendChild(td);
}

//Query the selected county to fetch the geometry
function LocateCountyOnMap(attributes) {
    isCountySearched = true;
    permitArray = [];
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    dojo.byId("imgSearchLoader").style.display = "block";

    var queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
    var query = new esri.tasks.Query();
    var countyName = countyLayerData.SearchQuery.split(" LIKE")[0];
    query.where = dojo.string.substitute(countyLayerData.SearchQuery, [attributes[countyName]]);
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        dojo.empty(dojo.byId('tblAddressResults'));
        ShowLocatedCountyOnMap(featureSet.features[0].geometry, attributes[countyName])
    });
}

//Locate searched county on map and add it to the breadcrumbs
function ShowLocatedCountyOnMap(geometry, locationName) {
    if (!isMobileDevice) {
        ShowProgressIndicator();
    }
    else {
        dojo.byId("imgSearchLoader").style.display = "block";
    }
    isCountySearched = true;

    if (geometry) {
        countyGeometry = geometry.getExtent();
        map.setExtent(countyGeometry);
    }
    for (var index in permitResultData) {
        permitLayerCounter++;
        FetchPermitResults(permitResultData[index], countyGeometry, index);
    }

    dojo.byId("trBreadCrumbs").style.display = "block";
    if (dojo.byId("tdBreadCrumbs").innerHTML.trim() != "") {
        if (dojo.byId("tdBreadCrumbs").innerHTML != locationName.split(",")[0]) {
            dojo.byId("tdBreadCrumbs").innerHTML = dojo.byId("tdBreadCrumbs").innerHTML + " > " + locationName.split(",")[0];
        }
    } else {
        dojo.byId("tdBreadCrumbs").innerHTML = locationName.split(",")[0];
    }
}

//Clear breadcrumbs container
function ClearBreadCrumbs() {
    dojo.byId("trBreadCrumbs").style.display = "none";
    dojo.byId("tdBreadCrumbs").innerHTML = "";
    permitLayerCounter = 0;
    queryExecutedCount = 0;
    countyGeometry = null;
    dojo.byId("imgSearchLoader").style.display = "none";
    dojo.empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.byId('divAddressScrollContainer'));
    isCountySearched = false;
}

//Locate searched permit on map and display the infowindow for the same
function LocatePermitOnMap(mapPoint, attributes, layerID, fields) {
    setTimeout(function () {
        if (mapPoint) {
            if (!isMobileDevice) {
                map.setExtent(mapPoint);
                ShowInfoWindowDetails(mapPoint, attributes, null, layerID, null, fields);
            } else {
                ShowMobileInfoWindow(mapPoint, attributes, layerID, fields);
            }
        }
    }, 500);
    if (!isMobileDevice) {
        if (dojo.coords("divAddressContent").h > 0) {
            dojo.replaceClass("divAddressContent", "hideContainerHeight", "showContainerHeight");
            dojo.byId('divAddressContent').style.height = '0px';
        }
    }
    if (isMobileDevice) {
        HideAddressContainer();
    }
}

//Display the current location of the user
function ShowMyLocation() {
    map.getLayer(tempGraphicsLayerId).clear();
    HideBaseMapLayerContainer();
    HideShareAppContainer();
    HideAddressContainer();
    var cTimeout = 8000 /* ms */, cBackupTimeout = 16000
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
            for (var bMap = 0; bMap < baseMapLayers.length; bMap++) {
                if (map.getLayer(baseMapLayers[bMap].Key).visible) {
                    var bmap = baseMapLayers[bMap].Key;
                }
            }
            if (!map.getLayer(bmap).fullExtent.contains(newPointCollection[0].getPoint(0))) {
                mapPoint = selectedMapPoint = null;
                map.getLayer(tempGraphicsLayerId).clear();
                map.infoWindow.hide();
                HideProgressIndicator();
                alert(messages.getElementsByTagName("geoLocation")[0].childNodes[0].nodeValue);
                return;
            }
            mapPoint = newPointCollection[0].getPoint(0);
            map.setLevel(locatorSettings.Locators[0].ZoomLevel);
            map.centerAt(mapPoint);
            var locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(locatorSettings.DefaultLocatorSymbol, locatorSettings.MarkupSymbolSize.width, locatorSettings.MarkupSymbolSize.height);
            var graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
                "Locator": true
            }, null);
            map.getLayer(tempGraphicsLayerId).add(graphic);
            HideProgressIndicator();
        });
    },
    function (error) {
        clearTimeout(backupTimeoutTimer);
        HideProgressIndicator();
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
    }, {
        timeout: cTimeout
    });
}

//Query the features while sharing infowindow
function ShareInfoWindow() {
    ShowProgressIndicator();
    for (var index in permitResultData) {
        if (index == sharedLayerID) {
            var layerIndex = index;
            var queryTask = new esri.tasks.QueryTask(permitResultData[index].ServiceURL);
            var query = new esri.tasks.Query();
            query.where = shareQuery.split("${0}")[0] + sharedFeatureID + shareQuery.split("${0}")[1];
            query.outFields = ["*"];
            query.outSpatialReference = map.spatialReference;
            query.returnGeometry = true;
            queryTask.execute(query, function (features) {
                if (features.features[0].geometry.type == "point") {
                    mapPoint = features.features[0].geometry;
                } else {
                    mapPoint = features.features[0].geometry.getExtent().getCenter();
                }
                setTimeout(function () {
                    for (var i in features.features[0].attributes) {
                        if (!features.features[0].attributes[i]) {
                            features.features[0].attributes[i] = showNullValueAs;
                        }
                    }
                    if (!isMobileDevice) {
                        ShowInfoWindowDetails(features.features[0].geometry, features.features[0].attributes, null, permitResultData[layerIndex], mapPoint, features.fields);
                    } else {
                        ShowMobileInfoWindow(mapPoint, features.features[0].attributes, permitResultData[layerIndex], features.fields);
                    }
                }, 500);
            });
        }
    }
    HideProgressIndicator();
}