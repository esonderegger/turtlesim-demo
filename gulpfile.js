const gulp = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sass = require('gulp-sass');
const sassLint = require('gulp-sass-lint');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const server = require('gulp-express');

gulp.task('sasslint', () => {
  return gulp.src(['client/scss/**/*.scss', 'client/scss/**/*.css'])
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError());
});

gulp.task('css', ['sasslint'], function() {
  return gulp.src('client/scss/turtlesim-demo.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'compressed',
    }))
    .pipe(rename({extname: '.min.css'}))
    .pipe(sourcemaps.write())
    .pipe(autoprefixer())
    .pipe(gulp.dest('client/public'));
});

gulp.task('eslint', () => {
  return gulp.src(['server/**/*.js', 'client/js/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('js', ['eslint'], function() {
  const prodMode = process.env.NODE_ENV === 'production';
  const browserifyEntries = ['client/js/turtlesim-demo.js'];
  return browserify(
    {
      entries: browserifyEntries,
      debug: !prodMode,
    })
    .transform('babelify', {presets: ['es2015']})
    .bundle()
    .pipe(source('turtlesim-demo.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(rename({extname: '.min.js'}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('client/public'));
});

gulp.task('server', function() {
    server.run(['server/app.js']);
    gulp.watch(['client/**/*.html'], server.notify);
    gulp.watch(['client/js/**/*.js'], ['js', server.notify]);
    gulp.watch(['client/scss/**/*.scss'], ['css', server.notify]);
    gulp.watch(['server/**/*.js'], [server.run]);
});
