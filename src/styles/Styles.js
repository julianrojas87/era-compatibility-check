import styled from 'styled-components';
import mnIconPath from '../img/blue-dot.png';

export const mapStyle = {
    width: "75vw",
    height: "86vh"
}

// Operational point icons
const mnIcon = new Image(15, 15);
mnIcon.src = mnIconPath;

export {
    mnIcon
};

export const ERALogo = styled.img`
    width: auto;
    height: 100%;
    z-index: 9000;
`;

export const eraLogoWrapper = {
    "float": "left",
    "paddingRight": "10px"
}

export const infoButton = {
    "verticalAlign": 0,
    "float": "right",
    "cursor": "pointer"
}

export const stickyMenu = {
    "position": "sticky",
    "top": 0,
    "zIndex": 999,
    "background": "#f7f7fa"
};

export const tileFrameStyle = {
    "fill-color": "#6F788A",
    "fill-opacity": 0.3
};

export const randomRouteStyle = () => {
    return {
        "line-color": getRandomColor(),
        "line-width": 3
    }
}

export const routeStyle = {
    "line-color": "#999999",
    "line-width": 3
}

export const StyledPopup = styled.div`
    background: white;
    color: #3F618C;
    font-weight: 400;
    font-size: 14px;
    font-family: monospace;
    padding: 5px;
    border-radius: 2px;
    display: inline-block;
    max-width: 500px;
`;

export const LoadingGIF = styled.img`
    width: 50px;
    height: 50px;
    position: absolute;
    top: 75px;
    right: 0px;
    z-index: 9000;
`;

export const sideBar = {
    flexDirection: 'column',
    flexBasis: 530,
    overflowY: 'auto',
    height: "85vh"
};

export const sidebarHeader = {
    padding: 18,
    fontSize: 22,
    height: 70,
    background: '#004494',
    color: ' #fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden'
};

export const inputStyle = {
    fontSize: '22px', 
    marginTop: '10px'
};

export const selectStyle = {
    width: '100%',
    marginTop: '10px'
}

export const stepStyle = {
    width: '200px',
    display: 'inline-table',
    verticalAlign: 'top'
}

export const panelStyle = color => {
    return {
        border: 'solid',
        borderColor: color,
        overflowX: 'auto',
        marginBottom: '10px'
    }
}

export const tableHeaderStyle = {
    borderLeft: '1px solid black',
    borderRight: '1px solid black',
    borderTop: '1px solid black',
    borderBottom: '1px solid black'
}

export const cellStyle = {
    borderLeft: '1px solid black',
    borderRight: '1px solid black'
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

export const RoutesPermalinkContainer = styled.div`
    display: flex;
    justify-content: space-around;
`;
