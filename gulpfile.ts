import { promises as fs } from "fs";
import * as path from "path";
import gulp from "gulp";
import postcss from "gulp-postcss";
import ts from "gulp-typescript";
import terser from "gulp-terser";
import * as _ from "lodash";
import * as yaml from "yaml";

import tsconfig from "./tsconfig.json";

export const build = gulp.parallel(scripts, styles, pages);

function scripts() {
  return gulp
    .src("src/scripts/*")
    .pipe(ts(tsconfig.compilerOptions))
    .pipe(
      terser({
        toplevel: true
      })
    )
    .pipe(gulp.dest("build/assets"));
}

async function pages() {
  const [
    layout,
    pageTemplateDictionary,
    sharedTemplateDictionary,
    dataDictionary
  ] = await Promise.all([
    getPageLayout(),
    getPageTemplates(),
    getSharedTemplates(),
    getData()
  ]);
  await Promise.all(
    Object.entries(pageTemplateDictionary).map(async ([pageName, template]) => {
      const data = dataDictionary[pageName];
      const title = (data && data.title) || pageName;
      await fs.writeFile(
        path.join(__dirname, `build/${pageName}.html`),
        layout({
          title: title === "index" ? "Casey Webb" : `Casey Webb | ${title}`,
          content: template({
            ...data,
            templates: sharedTemplateDictionary
          })
        })
      );
    })
  );
}

function styles() {
  return gulp
    .src("./src/style.pcss")
    .pipe(postcss([require("postcss-preset-env")()]))
    .pipe(gulp.dest("./build/assets"));
}

async function getPageLayout() {
  return _.template(
    await fs.readFile(path.join(__dirname, "src/layout.ejs"), "utf-8")
  );
}

async function getPageTemplates(): Promise<Record<string, _.TemplateExecutor>> {
  const pageTemplateDictionary = await getFileContentsDictionary("src/pages");
  return _.mapValues(pageTemplateDictionary, contents => _.template(contents));
}

async function getSharedTemplates(): Promise<
  Record<string, _.TemplateExecutor>
> {
  const sharedTemplateDictionary = await getFileContentsDictionary(
    "src/templates"
  );
  return _.mapValues(sharedTemplateDictionary, contents =>
    _.template(contents)
  );
}

async function getData(): Promise<Record<string, any>> {
  const dataDictionary = await getFileContentsDictionary("data");
  return _.mapValues(dataDictionary, contents => yaml.parse(contents));
}

async function getFileContentsDictionary(
  dir: string
): Promise<Record<string, string>> {
  const fileNames = await fs.readdir(path.join(__dirname, dir));
  const filesWithContents = await Promise.all(
    fileNames.map(async fileName => ({
      key: path.basename(fileName, path.extname(fileName)),
      value: await fs.readFile(path.join(__dirname, dir, fileName), "utf-8")
    }))
  );
  return filesWithContents.reduce(
    (accum, { key, value }) => ({
      ...accum,
      [key]: value
    }),
    {}
  );
}
