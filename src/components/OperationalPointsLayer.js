import React, { Component } from "react";
import { Layer, Feature } from "react-mapbox-gl";
import Utils from '../utils/Utils';
import { mnIcon } from '../styles/Styles';
import { ERA } from "../utils/NameSpaces";
import RDFetch from '../workers/RDFetch.worker';

export class OperationalPointsLayer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mnMarkers: []
        };
    }

    onMouseEnter = e => {
        e.map.getCanvas().style.cursor = 'pointer';
    }

    onMouseLeave = e => {
        e.map.getCanvas().style.cursor = '';
    }

    onClick = async e => {
        const op = Utils.getOPInfoFromLocation(e.feature.properties.geoId, e.lngLat, this.props.graphStore);
        // Check country data is present or fetch it otherwise
        const countries = op[ERA.inCountry];

        for (const c in countries) {
            if(!op[ERA.inCountry][c]) {
                await this.fetchCountry(c);
                op[ERA.inCountry][c] = Utils.getCountryInfo(c, this.props.graphStore);
            }
        }
        this.props.popupData(op);
    }

    fetchCountry = countryURI => {
        return new Promise((resolve, reject) => {
            const rdfetcht = new RDFetch();
            rdfetcht.addEventListener("message", (e) => {
                if (e.data === "done") {
                    rdfetcht.terminate();
                    resolve();
                } else {
                    this.props.graphStore.add(Utils.rebuildQuad(e.data));
                }
            });

            // Hardcoded proxy to fetch resources without proper CORS headers
            // as is the case for the EU country data.
            // TODO: Move the proxy to a config parameter
            rdfetcht.postMessage({ url: `http://proxy.linkeddatafragments.org/${countryURI}` });
        });
    };

    componentDidUpdate(prevProps) {
        if (JSON.stringify(prevProps.displayOPs) !== JSON.stringify(this.props.displayOPs)) {
            const { displayOPs } = this.props;
            const mnMarkers = [];

            for (const mn in displayOPs) {
                mnMarkers.push(
                    <Feature
                        key={mn}
                        properties={{ geoId: mn }}
                        coordinates={displayOPs[mn]}
                        onMouseEnter={this.onMouseEnter}
                        onMouseLeave={this.onMouseLeave}
                        onClick={(e) => this.onClick(e)}
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