import React from "react";
import { Button, Alert } from "rsuite";
import queryString from "query-string";

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(function () {
    Alert.info("Permalink copied to clipboard", 3000);
  });
}

export function SearchPermalink({ paramsType, params }) {
  const link = window.location.origin + window.location.pathname;
  const queryParams = queryString.stringify(
    {
      paramsType,
      ...params[paramsType],
    },
    { arrayFormat: "bracket" }
  );

  history.replaceState({ link, queryParams }, "", link + "?" + queryParams);

  return (
    <>
      <Button
        style={{ marginRight: "10px" }}
        size="xs"
        onClick={() => copyToClipboard(link + "?" + queryParams)}
      >
        copy search link to clipboard
      </Button>
      <a href={link + "?" + queryParams}>permalink</a>
    </>
  );
}
