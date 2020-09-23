import React, { Component, Fragment } from "react";
import { Layer, Feature } from "react-mapbox-gl";
import Utils from '../utils/Utils';
import { ERA, OP_TYPES } from "../utils/NameSpaces";
import {
    mnIcon
    /*stationIcon,
    smallStationIcon,
    passengerTerminalIcon,
    freightTerminalIcon,
    depotOrWorkshopIcon,
    technicalServicesIcon,
    passengerStopIcon,
    junctionIcon,
    borderPointIcon,
    shuntungYardIcon,
    technicalChangeIcon,
    switchIcon,
    privateSidingIcon,
    domesticBorderPointIcon*/
} from '../styles/Styles';

export class OperationalPointsLayer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mnMarkers: []
            /*stations: [],
            smallStations: [],
            passengerTerminals: [],
            freightTerminals: [],
            depotsOrWorkshops: [],
            technicalServices: [],
            passengerStops: [],
            junctions: [],
            borderPoints: [],
            shuntungYards: [],
            technicalChanges: [],
            switches: [],
            privateSidings: [],
            domesticBorderPoints: []*/
        };
    }

    onMouseEnter = e => {
        e.map.getCanvas().style.cursor = 'pointer';
        this.props.popupData(Utils.getMicroNodeInfo(e.feature.properties.geoId, e.lngLat, this.props.graphStore));
    }

    onMouseLeave = e => {
        e.map.getCanvas().style.cursor = '';
        this.props.closePopup();
    }

    onClick = e => {
        this.props.fromTo(Utils.getMicroNodeInfo(e.feature.properties.geoId, e.lngLat, this.props.graphStore));
    }

    componentDidUpdate(prevProps) {
        if (JSON.stringify(prevProps.microNodes) !== JSON.stringify(this.props.microNodes)) {
            const { microNodes } = this.props;
            const mnMarkers = [];
            /*const stations = [];
            const smallStations = [];
            const passengerTerminals = [];
            const freightTerminals = [];
            const depotsOrWorkshops = [];
            const technicalServices = [];
            const passengerStops = [];
            const junctions = [];
            const borderPoints = [];
            const shuntungYards = [];
            const technicalChanges = [];
            const switches = [];
            const privateSidings = [];
            const domesticBorderPoints = [];*/

            for (const mn in microNodes) {
                mnMarkers.push(
                    <Feature
                        key={mn}
                        properties={{ geoId: mn }}
                        coordinates={microNodes[mn]}
                        onMouseEnter={this.onMouseEnter}
                        onMouseLeave={this.onMouseLeave}
                        onClick={this.onClick}
                    ></Feature>
                );
                /*const op = Utils.getMicroNodeInfo(mn, null, this.props.graphStore);
                if (op) {
                    const type = op[ERA.opType]['@id'];
                    const feature = <Feature
                        key={mn}
                        properties={{ geoId: mn }}
                        coordinates={microNodes[mn]}
                        onMouseEnter={this.onMouseEnter}
                        onMouseLeave={this.onMouseLeave}
                        onClick={this.onClick}
                    ></Feature>

                    switch (type) {
                        case OP_TYPES.station:
                            stations.push(feature);
                            break;
                        case OP_TYPES.smallStation:
                            smallStations.push(feature);
                            break;
                        case OP_TYPES.passengerTerminal:
                            passengerTerminals.push(feature);
                            break;
                        case OP_TYPES.freightTerminal:
                            freightTerminals.push(feature);
                            break;
                        case OP_TYPES.depotOrWorkshop:
                            depotsOrWorkshops.push(feature);
                            break;
                        case OP_TYPES.trainTechnicalServices:
                            technicalServices.push(feature);
                            break;
                        case OP_TYPES.passengerStop:
                            passengerStops.push(feature);
                            break;
                        case OP_TYPES.junction:
                            junctions.push(feature);
                            break;
                        case OP_TYPES.borderPoint:
                            borderPoints.push(feature);
                            break;
                        case OP_TYPES.shuntungYard: // TODO: change to shunting yard
                            shuntungYards.push(feature);
                            break;
                        case OP_TYPES.technicalChange:
                            technicalChanges.push(feature);
                            break;
                        case OP_TYPES.switch:
                            switches.push(feature);
                            break;
                        case OP_TYPES.privateSiding:
                            privateSidings.push(feature);
                            break;
                        case OP_TYPES.domesticBorderPoint:
                            domesticBorderPoints.push(feature);
                            break;
                    }
                }*/
            }
            this.setState({
                mnMarkers: mnMarkers
                /*stations: stations,
                smallStations: smallStations,
                passengerTerminals: passengerTerminals,
                freightTerminals: freightTerminals,
                depotsOrWorkshops: depotsOrWorkshops,
                technicalServices: technicalServices,
                passengerStops: passengerStops,
                junctions: junctions,
                borderPoints: borderPoints,
                shuntungYards: shuntungYards,
                technicalChanges: technicalChanges,
                switches: switches,
                privateSidings: privateSidings,
                domesticBorderPoints: domesticBorderPoints*/
            });
        }
    }

    render() {
        const {
            mnMarkers
            /*stations,
            smallStations,
            passengerTerminals,
            freightTerminals,
            depotsOrWorkshops,
            technicalServices,
            passengerStops,
            junctions,
            borderPoints,
            shuntungYards,
            technicalChanges,
            switches,
            privateSidings,
            domesticBorderPoints*/
        } = this.state;

        return (
            <Layer type="symbol" layout={{ 'icon-image': 'mn-icon' }} images={['mn-icon', mnIcon]}>
                {mnMarkers}
            </Layer>

            /*<Fragment>
                <Layer type="symbol" layout={{ 'icon-image': 'station-icon' }} images={['station-icon', stationIcon]}>
                    {stations}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'small-station-icon' }} images={['small-station-icon', smallStationIcon]}>
                    {smallStations}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'passenger-terminal-icon' }} images={['passenger-terminal-icon', passengerTerminalIcon]}>
                    {passengerTerminals}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'freight-terminal-icon' }} images={['freight-terminal-icon', freightTerminalIcon]}>
                    {freightTerminals}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'depot-or-workshop-icon' }} images={['depot-or-workshop-icon', depotOrWorkshopIcon]}>
                    {depotsOrWorkshops}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'technical-services-icon' }} images={['technical-services-icon', technicalServicesIcon]}>
                    {technicalServices}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'passenger-stop-icon' }} images={['passenger-stop-icon', passengerStopIcon]}>
                    {passengerStops}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'junction-icon' }} images={['junction-icon', junctionIcon]}>
                    {junctions}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'border-point-icon' }} images={['border-point-icon', borderPointIcon]}>
                    {borderPoints}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'shuntung-yard-icon' }} images={['shuntung-yard-icon', shuntungYardIcon]}>
                    {shuntungYards}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'technical-change-icon' }} images={['technical-change-icon', technicalChangeIcon]}>
                    {technicalChanges}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'switch-icon' }} images={['switch-icon', switchIcon]}>
                    {switches}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'private-siding-icon' }} images={['private-siding-icon', privateSidingIcon]}>
                    {privateSidings}
                </Layer>
                <Layer type="symbol" layout={{ 'icon-image': 'domestic-border-point-icon' }} images={['domestic-border-point-icon', domesticBorderPointIcon]}>
                    {domesticBorderPoints}
                </Layer>
            </Fragment>*/
        );
    }

}