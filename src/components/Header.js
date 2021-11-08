import React from "react";
import { Nav, Navbar, Dropdown, Icon } from "rsuite";
import eraLogoPath from "../img/era-logo-new.png";
import { ERALogo } from "../styles/Styles";
import { availableLanguages, getPhrase } from "../utils/Languages";

const { Header, Body } = Navbar;
const { Item } = Nav;

export default function NavHeader({ language, saveLanguage }) {
  return (
    <Navbar>
      <Header>
        <ERALogo src={eraLogoPath} className="logo" />
      </Header>
      <Body>
        <Nav pullRight>
          <Item href="/">{getPhrase("routeCompatibilityCheck", language)}</Item>
          <Item href="/search" icon={<Icon icon="search" />}>{getPhrase("search", language)}</Item>
          <Dropdown title={availableLanguages[language]} icon={<Icon icon="globe" />}>
            {Object.keys(availableLanguages).map((l) => (
              <Dropdown.Item key={l} onSelect={() => saveLanguage(l)}>
                {availableLanguages[l]}
              </Dropdown.Item>
            ))}
          </Dropdown>
        </Nav>
      </Body>
    </Navbar>
  );
}
