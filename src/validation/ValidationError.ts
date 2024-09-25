// src/validation/ValidationError.ts
export class ValidationError {
  target?: object;
  property: string;
  value: any;
  constraints?: { [type: string]: string };

  constructor(
    property: string,
    value: any,
    constraints?: { [type: string]: string },
  ) {
    this.property = property;
    this.value = value;
    this.constraints = constraints;
  }
}
