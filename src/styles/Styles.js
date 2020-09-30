import styled from 'styled-components';
import mnIconPath from '../img/junction-icon.svg';

export const mapStyle = {
    height: "90vh",
    width: "68vw"
}

// Operational point icons
const mnIcon = new Image(20, 20);
mnIcon.src = mnIconPath;
/*const stationIcon = new Image(60, 60);
stationIcon.src = 'src/img/station-icon.png';
const smallStationIcon = new Image(30, 30);
smallStationIcon.src = 'src/img/small-station-icon.png';
const passengerTerminalIcon = new Image(30, 30);
passengerTerminalIcon.src = 'src/img/passenger-terminal-icon.svg';
const freightTerminalIcon = new Image(40, 40);
freightTerminalIcon.src = 'src/img/freight-terminal-icon.png';
const depotOrWorkshopIcon = new Image(40, 40);
depotOrWorkshopIcon.src = 'src/img/depot-or-workshop-icon.png';
const technicalServicesIcon = new Image(30, 30);
technicalServicesIcon.src = 'src/img/technical-services-icon.svg';
const passengerStopIcon = new Image(30, 30);
passengerStopIcon.src = 'src/img/passenger-stop-icon.svg';
const junctionIcon = new Image(30, 30);
junctionIcon.src = 'src/img/junction-icon.svg';
const borderPointIcon = new Image(30, 30);
borderPointIcon.src = 'src/img/border-point-icon.svg';
const shuntungYardIcon = new Image(30, 30);
shuntungYardIcon.src = 'src/img/shuntung-yard-icon.svg';
const technicalChangeIcon = new Image(30, 30);
technicalChangeIcon.src = 'src/img/technical-change-icon.png';
const switchIcon = new Image(30, 30);
switchIcon.src = 'src/img/switch-icon.svg';
const privateSidingIcon = new Image(40, 40);
privateSidingIcon.src = 'src/img/private-siding-icon.svg';
const domesticBorderPointIcon = new Image(30, 30);
domesticBorderPointIcon.src = 'src/img/domestic-border-point-icon.svg';*/

export {
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
    height: 56,
    background: '#34c3ff',
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