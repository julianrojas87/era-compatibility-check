import styled from 'styled-components';
import mnIconPath from '../img/junction-icon.svg';

export const mapStyle = {
    height: "90vh",
    width: "68vw"
}

// Operational point icons
const mnIcon = new Image(20, 20);
mnIcon.src = mnIconPath;

export {
    mnIcon
};

export const ERALogo = styled.img`
    width: 115px;
    height: 70px;
    z-index: 9000;
`;

export const eraLogoWrapper = {
    "float": "left",
    "paddingRight": "10px"
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
    top: 0px;
    right: 0px;
    z-index: 9000;
`;

export const sideBar = {
    flexDirection: 'column',
    flexBasis: 530,
    overflowY: 'auto',
    height: "96.5vh"
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

export const inputGroup = {
    width: '100%',
    marginBottom: 10,
    marginTop: 10
};

export const input = {
    fontSize: 16,
    paddingLeft: 70,
    paddingTop: 9,
    color: '#094b8d',
    cursor: 'text'
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
};

export const cellStyle = {
    borderLeft: '1px solid black',
    borderRight: '1px solid black', 
    textAlign: 'center'
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}