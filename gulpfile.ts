import { promises as fs, access } from "fs";
import * as http from "http";
import * as path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { google } from "googleapis";
import gulp from "gulp";
import postcss from "gulp-postcss";
import ts from "gulp-typescript";
import terser from "gulp-terser";
import * as _ from "lodash";
import open from "open";
import * as yaml from "yaml";

import tsconfig from "./tsconfig.json";

dotenv.config();

const port = 3000;
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:${port}`
);

export const build = gulp.series(
  fetchImages,
  gulp.parallel(scripts, styles, pages)
);

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

async function fetchImages() {
  const token = await authenticateGooglePhotosAPI();

  const api = axios.create({
    baseURL: "https://photoslibrary.googleapis.com/v1/",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const albums = await api.get("albums");

  console.log(albums.data);
}

function authenticateGooglePhotosAPI() {
  const url = oauth2Client.generateAuthUrl({
    scope: "https://www.googleapis.com/auth/photoslibrary.readonly"
  });

  return new Promise(resolve => {
    const server = http.createServer(async (req, res) => {
      const [, code] = (req.url as string).match(
        /\?code=([^&]+)/
      ) as RegExpMatchArray;

      const {
        tokens: { access_token }
      } = await oauth2Client.getToken(code);

      resolve(access_token);

      res.write("You may now close this window");
      res.end();
      server.close();
    });

    server.listen(3000);

    open(url);
  });
}
