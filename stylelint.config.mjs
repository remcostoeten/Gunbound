/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard", "stylelint-config-recess-order"],
  rules: {
    "selector-max-id": 0,
    "declaration-no-important": true,
    "color-named": "never",
    "selector-class-pattern": "^[a-z][a-zA-Z0-9]*$",
  },
};
