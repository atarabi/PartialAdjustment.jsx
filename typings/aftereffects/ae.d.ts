/// <reference path="./lib.d.ts" />
/// <reference path="./es.d.ts" />
/// <reference path="./ui.d.ts" />
/// <reference path="./ae.constants.d.ts" />
/// <reference path="./ae.types.d.ts" />

declare var alert: (message?, title?, errorIcon?) => void;
declare var confirm: (message?, noAsDefault?, title?) => boolean;
declare var prompt: (prompt?, defaultText?, title?) => string;
declare var app: Application;
declare var system: System;