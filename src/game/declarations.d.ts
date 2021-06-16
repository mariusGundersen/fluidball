
module "url:*.png" {
  declare const url: string;
  export default url;
}

module "url:*.jpg" {
  declare const url: string;
  export default url;
}

type Trim<T extends string> = T extends `\n${infer Rest}`
  ? Trim<Rest>
  : T extends ` ${infer Rest}`
  ? Trim<Rest>
  : T;

type UniformTypeMap = {
  float: number,
  vec2: [number, number],
  vec3: [number, number, number],
  vec4: [number, number, number, number],
  mat2: number[],
  mat3: number[],
  mat4: number[],
  sampler2D: number
}

type GetAllUniforms<T extends string>
  = T extends `${string}uniform ${infer Type} ${infer Name};${infer Rest}`
  ? Record<Name, UniformTypeMap[Type]> & GetAllUniforms<Rest>
  : unknown;