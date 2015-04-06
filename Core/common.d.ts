// 
// Copyright (C) Microsoft. All rights reserved.
//

declare var require: {
    (name: string): any;
    (names: string[], callback: Function ): void;
    config(values: { [key: string]: any; }): void;
};

/// <disable code="SA1302" justification="Extending existing interface" />
interface Window {
/// <enable code="SA1302" />
    errorComponent: string;
    errorDisplayHandler: Function;
    getExternalObj(): any;
    reportError: (message: string, file: string, line: number, additionalInfo: string, column?: number) => void;
}