import React, { useState } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Container, Header, Content, Footer } from "rsuite";
import 'rsuite/dist/styles/rsuite-default.css';
import "./index.css";

import NavHeader from "./components/Header";
import NavFooter from "./components/Footer";
import MainLayout from "./components/MainLayout";
import Search from "./components/Search";

function App() {
  const [language, setLanguage] = useState(
    window.localStorage.getItem("language") || "en"
  );

  const saveLanguage = (lang) => {
    setLanguage(lang);
    window.localStorage.setItem("language", lang);
  };

  return (
    <Container>
      <Header>
        <NavHeader language={language} saveLanguage={saveLanguage} />
      </Header>
      <Content>
        <Router>
          <Switch>
            <Route path="/search" component={Search}></Route>
            <Route path="/" component={MainLayout}></Route>
          </Switch>
        </Router>
      </Content>
      <Footer>
        <NavFooter language={language} />
      </Footer>
    </Container>
  );
}

export default App;
