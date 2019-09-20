import gulp from "gulp";
import ts from "gulp-typescript";
import terser from "gulp-terser";

import tsconfig from "./tsconfig.json";

export const build = gulp.series(scripts);

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
