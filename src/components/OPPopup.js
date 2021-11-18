import React from "react";
import { Popup } from "react-mapbox-gl";
import { IconButton, Icon } from "rsuite";
import { StyledPopup } from "../styles/Styles";
import Utils from '../utils/Utils';
import { getPhrase } from "../utils/Languages";
import { RDFS, ERA, WGS84, SKOS, GEOSPARQL } from "../utils/NameSpaces";

export const OPPopup = ({ popup, closePopup, language }) => {
    return (
        <Popup coordinates={popup.lngLat}>
            <IconButton icon={<Icon icon="close" />}
                style={{ float: 'right' }} onClick={closePopup} />
            <StyledPopup>
                <h2>
                    <a href={popup['@id']} target='_blank'>
                        {Utils.getLiteralInLanguage(popup[RDFS.label])}
                    </a>
                </h2>
                <div>
                    <strong>
                        <a href={ERA.uopid} target='_blank'>{getPhrase('rinfId', language)}: </a>
                    </strong>
                    {Utils.getLiteralInLanguage(popup[ERA.uopid], language)}
                </div>
                {popup[ERA.tafTapCode] && (
                    <div>
                        <strong>
                            <a href={ERA.tafTapCode} target='_blank'>{getPhrase('tafTapCode', language)}: </a>
                        </strong>
                        {Array.isArray(popup[ERA.tafTapCode]) ? popup[ERA.tafTapCode].map(c => c.value).join(', ')
                            : popup[ERA.tafTapCode].value}
                    </div>
                )}
                <div>
                    <strong>
                        <a href={ERA.opType} target="_blank">{getPhrase('type', language)}: </a>
                        <a href={popup[ERA.opType]['@id']} target="_blank">
                            {Utils.getLiteralInLanguage(popup[ERA.opType][SKOS.prefLabel], language)}
                        </a>
                    </strong>
                </div>
                <div>
                    <strong>
                        <a href={WGS84.location} target='_blank'>{getPhrase('geographicalLocation', language)}: </a>
                    </strong>
                    {popup[WGS84.location][GEOSPARQL.asWKT].value}
                </div>
                <div>
                    <strong>
                        <a href={ERA.inCountry} target='_blank'>{getPhrase('country', language)}: </a>
                        {Object.keys(popup[ERA.inCountry]).map((c, i) => {
                            const sep = i < Object.keys(popup[ERA.inCountry]).length - 1 ? ', ' : '';
                            return (
                                <a key={c} href={c} target='_blank'>
                                    {Utils.getLiteralInLanguage(popup[ERA.inCountry][c][SKOS.prefLabel], language) + sep}
                                </a>
                            );
                        })}
                    </strong>
                </div>
            </StyledPopup>
        </Popup>
    )
}