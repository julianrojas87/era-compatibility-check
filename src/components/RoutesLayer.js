import React, { Component, Fragment } from "react";
import { Layer, Feature } from "react-mapbox-gl";
import Utils from "../utils/Utils";
import { routeStyle } from "../styles/Styles";

export class RoutesLayer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            openRoute: {},
            openRouteStyles: [],
            routeFeatures: []
        };
        this.routeFilter = new Set();
    }

    parseRoute = route => {
        let linePath = [];
        for (const stop of route.path) {
            if(stop.lngLat) {
                linePath.push(stop.lngLat);
                if (route.renderNodes) {
                    this.routeFilter.add(stop.lngLat.join('_'));
                }
            }
        }
        return linePath;
    }

    componentDidUpdate(prevProps) {
        if (JSON.stringify(prevProps.routes) !== JSON.stringify(this.props.routes)) {
            this.routeFilter = new Set();
            const { routes } = this.props;
            const routeFeatures = [];
            const openRouteStyles = [];
            const openRoute = {};

            for (const [i, r] of routes.entries()) {
                if (!openRouteStyles[i]) {
                    openRouteStyles[i] = r.style;
                }

                if (r.renderNodes) {
                    openRoute['index'] = i;
                    openRoute['feature'] = (
                        <Feature
                            key={`route-feature-${i}`}
                            coordinates={this.parseRoute(r)}>
                        </Feature>
                    );
                } else {
                    routeFeatures.push(
                        <Feature
                            key={`route-feature-${i}`}
                            coordinates={this.parseRoute(r)}>
                        </Feature>
                    );
                }
            }

            if(this.routeFilter.size > 0) this.props.updateRouteFilter(this.routeFilter);
            this.setState(() => {
                return {
                    openRoute: openRoute,
                    openRouteStyles: openRouteStyles,
                    routeFeatures: routeFeatures
                }
            });
        }
    }

    render() {
        const { openRoute, openRouteStyles, routeFeatures } = this.state;

        return (
            <Fragment>
                <Layer key={'hidden-routes'} type="line" paint={routeStyle}>{routeFeatures}</Layer>
                <Layer key={'open-route'} type="line" paint={openRouteStyles[openRoute.index]}>{openRoute.feature}</Layer>
            </Fragment>
        );
    }
}