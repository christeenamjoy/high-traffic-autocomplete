import React from "react";
import { Suggestion } from "../../fakeAPi";

export const Row = React.memo(function Row({
    item,
    onPick,
  }: {
    item: Suggestion;
    onPick: (s: Suggestion) => void;
  }) {
    return (
      <li
        role="option"
        className="row"
        onMouseDown={(e) => {
          // prevent blur before click
          e.preventDefault();
          onPick(item);
        }}
      >
        {item.label}
      </li>
    );
  });
  