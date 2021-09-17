interface Phone {
  id?: string,
  name: string,
  manufacturer: string,
  description?: string,
  color?: string,
  price: number,
  screen?: string,
  processor?: string,
  ram?: number,
  file: Image,
}

interface Image {
  hapi: FileDetails,
  _data: Buffer,
}

interface FileDetails {
  filename: string;
  headers: Array<string>
}