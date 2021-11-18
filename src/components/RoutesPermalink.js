import React from "react";
import { Container, Button, Divider, Alert } from "rsuite";
import { RoutesPermalinkContainer } from "../styles/Styles";
import queryString from "query-string";

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(function () {
    Alert.info("Permalink copied to clipboard", 3000);
  });
}

export function RoutesPermalink({
  fromId,
  fromLoc,
  toId,
  toLoc,
  routes,
  maxRoutes,
  compatibilityVehicleType,
}) {
  if (routes?.length > 0) {
    const link = window.location.origin + window.location.pathname;
    const params = queryString.stringify({
      fromId,
      fromLng: fromLoc[0],
      fromLat: fromLoc[1],
      toId,
      toLng: toLoc[0],
      toLat: toLoc[1],
      maxRoutes,
      compatibilityVehicleType,
    });

    return (
      <Container>
        <Divider />
        <RoutesPermalinkContainer>
          <a href={link + "?" + params}>permalink</a>
          <Button
            appearance="primary"
            size="xs"
            onClick={() => copyToClipboard(link + "?" + params)}
          >
            copy link to clipboard
          </Button>
        </RoutesPermalinkContainer>
      </Container>
    );
  }

  return null;
}
