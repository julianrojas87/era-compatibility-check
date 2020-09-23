import React, { Component } from "react";
import { Layer, Feature } from "react-mapbox-gl";
import { tileFrameStyle } from "../styles/Styles";

export class TileFramesLayer extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const { tileFrames } = this.props;
        const frames = [];
        
        for (const [i, f] of tileFrames.entries()) {
            frames.push(<Feature key={i} coordinates={f}></Feature>);
        }

        return (
            frames.length > 0 && <Layer type="fill" paint={tileFrameStyle}>{frames}</Layer>
        );
    }
}