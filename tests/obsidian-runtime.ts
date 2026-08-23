export class TFile {
  basename = "";
  extension = "md";
  parent: TFolder | null = null;
  path = "";
}

export class TFolder {
  children: (TFile | TFolder)[] = [];
  name = "";
  path = "";
}
