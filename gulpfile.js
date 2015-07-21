var gulp = require("gulp");
var typedoc = require("gulp-typedoc");
gulp.task("doc", function() {
    return gulp
        .src(["src/**/*.ts"])
        .pipe(typedoc({
            target: "es5",
            out: "doc/",
            name: "drunk"
        }))
    ;
});