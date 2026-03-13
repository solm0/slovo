declare module "opentype.js" {

  export interface Command {
    type: string
    x?: number
    y?: number
    x1?: number
    y1?: number
    x2?: number
    y2?: number
  }

  export interface Path {
    commands: Command[]
  }

  export interface Glyph {
    advanceWidth: number
    getPath(): Path
  }

  export interface Font {
    charToGlyph(char:string):Glyph
  }

  export function load(url:string):Promise<Font>

}