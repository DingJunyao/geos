//////////////// GLOBAL FUNCTION DEFINITIONS ////////////////////////////
/**
 * implement a String.format function similar to the one
 * known from python.
 */
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}


/////////////// DRAWING-RELATED FUNCTIONS //////////////////////////////
/**
 * Format length output.
 * @param {ol.geom.LineString} line The line.
 * @return {string} The formatted length.
 */
var formatLength = function (line) {
    var length;
    var coordinates = line.getCoordinates();
    length = 0;
    var sourceProj = map.getView().getProjection();
    for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
        var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
        var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
        length += wgs84Sphere.haversineDistance(c1, c2);
    }
    var output;
    if (length > 100) {
        output = (Math.round(length / 1000 * 100) / 100) +
            ' ' + 'km';
    } else {
        output = (Math.round(length * 100) / 100) +
            ' ' + 'm';
    }
    return output;
};


/**
 * Format area output.
 * @param {ol.geom.Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
var formatArea = function (polygon) {
    var area;
    var sourceProj = map.getView().getProjection();
    var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
        sourceProj, 'EPSG:4326'));
    var coordinates = geom.getLinearRing(0).getCoordinates();
    area = Math.abs(wgs84Sphere.geodesicArea(coordinates));
    var output;
    if (area > 10000) {
        output = (Math.round(area / 1000000 * 100) / 100) +
            ' ' + 'km<sup>2</sup>';
    } else {
        output = (Math.round(area * 100) / 100) +
            ' ' + 'm<sup>2</sup>';
    }
    return output;
};


function addInteraction() {
    var type = (measureType == 'area' ? 'Polygon' : 'LineString');
    draw = new ol.interaction.Draw({
        source: source,
        type: /** @type {ol.geom.GeometryType} */ (type),
        style: new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.2)'
            }),
            stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 0, 0.5)',
                lineDash: [10, 10],
                width: 2
            }),
            image: new ol.style.Circle({
                radius: 5,
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 0, 0.7)'
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                })
            })
        })
    });
    map.addInteraction(draw);

    createMeasureTooltip();
    createHelpTooltip();

    var listener;
    draw.on('drawstart',
        function (evt) {
            // set sketch
            sketch = evt.feature;

            /** @type {ol.Coordinate|undefined} */
            var tooltipCoord = evt.coordinate;

            listener = sketch.getGeometry().on('change', function (evt) {
                var geom = evt.target;
                var output;
                if (geom instanceof ol.geom.Polygon) {
                    output = formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof ol.geom.LineString) {
                    output = formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate();
                }
                measureTooltipElement.innerHTML = output;
                measureTooltip.setPosition(tooltipCoord);
            });
        }, this);

    draw.on('drawend',
        function () {
            measureTooltipElement.className = 'tooltip tooltip-static';
            measureTooltip.setOffset([0, -7]);
            // unset sketch
            sketch = null;
            // unset tooltip so that a new one can be created
            measureTooltipElement = null;
            createMeasureTooltip();
            ol.Observable.unByKey(listener);
        }, this);
}


/**
 * Creates a new help tooltip
 */
function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'tooltip hidden';
    helpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left'
    });
    map.addOverlay(helpTooltip);
}


/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center'
    });
    map.addOverlay(measureTooltip);
}

/**
 * Handle pointer move.
 * @param {ol.MapBrowserEvent} evt The event.
 */
var pointerMoveHandler = function (evt) {
    if (evt.dragging) {
        return;
    }
    /** @type {string} */
    var helpMsg = 'Click to start drawing';

    if (sketch) {
        var geom = (sketch.getGeometry());
        if (geom instanceof ol.geom.Polygon) {
            helpMsg = continuePolygonMsg;
        } else if (geom instanceof ol.geom.LineString) {
            helpMsg = continueLineMsg;
        }
    }

    helpTooltipElement.innerHTML = helpMsg;
    helpTooltip.setPosition(evt.coordinate);

    helpTooltipElement.classList.remove('hidden');
};


//////////////////// GLOBAL VARIABLE DECLARATIONS /////////////////
var wgs84Sphere = new ol.Sphere(6378137);

/**
 * vector source for drawing
 * @type {any}
 */
var source = new ol.source.Vector();

/**
 * vector layer for drawing
 * @type {any}
 */
var vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33'
            })
        })
    })
});

// layers that persist when a new map is added.
var persistentLayers = [vector]

/**
 * global map object
 * @type {ol.Map}
 */
var map = new ol.Map({
    layers: persistentLayers,
    target: 'map',
    view: new ol.View({
        center: ol.proj.fromLonLat([37.41, 8.82]),
        zoom: 4
    })
});

/**
 * Currently drawn feature.
 * @type {ol.Feature}
 */
var sketch;

/**
 * The help tooltip element.
 * @type {Element}
 */
var helpTooltipElement;

/**
 * Overlay to show the help messages.
 * @type {ol.Overlay}
 */
var helpTooltip;

/**
 * The measure tooltip element.
 * @type {Element}
 */
var measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {ol.Overlay}
 */
var measureTooltip;

/**
 * Message to show when the user is drawing a polygon.
 * @type {string}
 */
var continuePolygonMsg = 'Click to continue drawing the polygon';

/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */
var continueLineMsg = 'Click to continue drawing the line';

var measureType = 'line'

var draw; // global so we can remove it later


var mapSources = [];
var currentMap;

function activateMap(mapSource) {
    currentMap = mapSource;
    $('#map li.active').removeClass('active');
    $('#' + mapSource.id).addClass('active');
    console.log(mapSource.name);
    layers = map.getLayers();
    layers.clear();
    $.each(mapSource.layers, function (i, tileLayer) {
        tmpLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: tileLayer.tile_url,
                crossOrigin: 'anonymous',
                minZoom: tileLayer.min_zoom,
                maxZoom: tileLayer.max_zoom
            })
        });
        layers.push(tmpLayer)
    });
    layers.extend(persistentLayers);
}

$(document).ready(function () {
    $('.navbar-nav').click(function () {
        $('.navbar-inverse .in').collapse('hide');
    });

    $('.navbar-toggle').click(function () {
        $('.childMenu.in').collapse('hide');
    });

    //download and process map sources
    $.getJSON('/maps.json', function (tmpMapSources) {
        //data is the JSON string
        mapSources = tmpMapSources;
        $.each(mapSources, function (mapId, mapSource) {
            $li = $("<li>", {'id': mapSource.id});
            $a = $("<a>", {'href': "#"}).html(mapSource.name)
            $a.click(activateMap(mapSource));
            $li.append($a);
            $("#maps").append($li);
        });
        activateMap(tmpMapSources.default)
    });

    // activate drawing functions
    map.on('pointermove', pointerMoveHandler);
    map.getViewport().addEventListener('mouseout', function () {
        helpTooltipElement.classList.add('hidden');
    });
    addInteraction();

    // listener to change measure-type
    $("#type_select li a.measure-type").click(function () {
        measureType = $(this).attr("data-value");
        map.removeInteraction(draw);
        addInteraction();
    });

    // listener for printing
    $("#print").click(function () {
        center = map.getView().getCenter();
        window.open("/print/{0}/{1}/{2}/map.pdf".format(currentMap.id, center[0], center[1]))
    });

});
