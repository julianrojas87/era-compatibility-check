import React, { Component } from "react";
import { Layer, Feature } from "react-mapbox-gl";
import Utils from '../utils/Utils';
import { mnIcon } from '../styles/Styles';

export class OperationalPointsLayer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mnMarkers: []
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
            }
            this.setState({
                mnMarkers: mnMarkers
            });
        }
    }

    render() {
        const { mnMarkers } = this.state;

        return (
            <Layer type="symbol" layout={{ 'icon-image': 'mn-icon' }} images={['mn-icon', mnIcon]}>
                {mnMarkers}
            </Layer>
        );
    }

}