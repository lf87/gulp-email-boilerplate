(function () {
  'use strict';
  var extractmediaqueries = require('gulp-extract-media-queries'),
    nunjucksRender = require('gulp-nunjucks-render'),
    htmlbeautify = require('gulp-html-beautify'),
    styleInject = require("gulp-style-inject"),
    sourcemaps = require('gulp-sourcemaps'),
    gulpPngquant = require('gulp-pngquant'),
    inlineCss = require('gulp-inline-css'),
    runSequence = require('run-sequence'),
    scsslint = require('gulp-scss-lint'),
    imagemin = require('gulp-imagemin'),
    sendmail = require('gulp-mailgun'),
    changed = require('gulp-changed'),
    notify = require('gulp-notify'),
    rename = require('gulp-rename'),
    index = require('gulp-index'),
    newer = require('gulp-newer'),
    gutil = require('gulp-util'),
    data = require('gulp-data'),
    scss = require('gulp-sass'),
    ftp = require('vinyl-ftp'),
    gulp = require('gulp'),
    del = require('del'),
    fs = require('fs'),
    browserSync = require('browser-sync').create(), // Create BS server
    htmlInjector = require('bs-html-injector'); // Injects markup

  var src = {
    pages: 'src/pages/**/*.html',
    data: 'src/data/**/*.json',
    templates: 'src/templates/**/*',
    pagesWatch: 'src/components/**/*.html',
    scss: 'src/styles/**/*.scss',
    img: 'src/images/**/*.jpg',
    imgPng: 'src/images/**/*.png',
    imgGif: 'src/images/**/*.gif'
  };

  var dist = {
    pages: 'dist',
    css: 'dist',
    img: 'dist/img'
  };

  var config = {
    maps: '../maps', // This is where your CSS and JS sourcemaps go
    reports: 'reports',
    lint: 'src/styles/**/*.scss', // Path of SCSS files that you want to lint
    templates: 'src/templates/',
    pagesWatch: 'dist/*.html' // Directory where pages are output (Not sure why this glob pattern works)
  };

  // Disable or enable pop up notifications
  var notifications = false;
  if (notifications) {
    process.env.DISABLE_NOTIFIER = true;
  }

  // ********************** //
  // *** Required Tasks *** //
  // ********************** //

  // Browser Sync with code/HTML injection
  gulp.task('browser-sync', function () {
    browserSync.use(htmlInjector, {
      files: 'dist/*.html'
    });
    browserSync.init({
      server: dist.pages,
      files: dist.css + '/style.css'
      // watchOptions: {
      //     awaitWriteFinish: true
      // }
    });
  });


  gulp.task('scss', function () {
    return gulp.src(src.scss)
      .pipe(sourcemaps.init())
      .pipe(scss({
        includePaths: [src.scss]
      }))
      .on('error', notify.onError(function (error) {
        return 'An error occurred while compiling scss.\nLook in the console for details.\n' + error;
      }))
      .pipe(sourcemaps.write(config.maps))
      .pipe(gulp.dest(dist.css));
  });

  var dataFile = './src/data/data.json';
  gulp.task('nunjucks-pages', function () {
    nunjucksRender.nunjucks.configure([src.templates]);
    return gulp.src([src.pages, '!src/pages/index.html'])
      .pipe(data(function (file) {
        return JSON.parse(fs.readFileSync(dataFile));
      }))
      .on('error', notify.onError(function (error) {
        return 'An error occurred while compiling files.\nLook in the console for details.\n' + error;
      }))
      .pipe(changed(dist.pages, {
        hasChanged: changed.compareLastModifiedTime
      }))
      .pipe(nunjucksRender({
        path: [config.templates],
        ext: '.html',
      }))
      .on('error', notify.onError(function (error) {
        return 'An error occurred while compiling files.\nLook in the console for details.\n' + error;
      }))

      .pipe(gulp.dest(dist.pages));
    //.on('data', function() { gutil.log('1!'); })
  });

  // Temporary workaround to get HTML injection working when editing pages is to create duplicate task and not include the caching plugin
  gulp.task('nunjucks-templates', function () {
    nunjucksRender.nunjucks.configure([src.templates]);
    return gulp.src([src.pages, '!src/pages/index.html'])
      .pipe(data(function (file) {
        return JSON.parse(fs.readFileSync(dataFile));
      }))
      .on('error', notify.onError(function (error) {
        return 'An error occurred while compiling scss.\nLook in the console for details.\n' + error;
      }))
      .pipe(nunjucksRender({
        path: [config.templates],
        ext: '.html',
      }))
      .on('error', notify.onError(function (error) {
        return 'An error occurred while compiling files.\nLook in the console for details.\n' + error;
      }))
      .pipe(gulp.dest(dist.pages));
    //.on('data', function() { gutil.log('1!'); })
  });

  // $ Save for web in PS first!
  gulp.task('images', function () {
    return gulp.src(src.img)
      .pipe(newer(dist.img))
      .pipe(imagemin({
        optimizationLevel: 7,
        progressive: true,
        interlaced: true
      }))
      .pipe(gulp.dest(dist.img))
      .pipe(browserSync.stream({
        once: true
      }));
  });

  gulp.task('images-png', function () {
    return gulp.src(src.imgPng)
      .pipe(newer(dist.img))
      .pipe(gulpPngquant({
        quality: '65-80'
      }))
      .pipe(gulp.dest(dist.img))
      .pipe(browserSync.stream({
        once: true
      }));
  });

  gulp.task('images-gif', function () {
    return gulp.src(src.imgGif)
      .pipe(newer(dist.img))
      .pipe(gulp.dest(dist.img))
      .pipe(browserSync.stream({
        once: true
      }));
  });

  gulp.task('html:buildIndex', function () {
    return gulp.src(dist.pages + '/**/*.html')
      .pipe(index({
        'prepend-to-output': () => '<table border="0" cellpadding="0" cellspacing="0"><tr><td style="background-color: #f1f1f1;padding: 1rem 3rem;" valign="top">',
        'append-to-output': () => '</td></tr></table>',
        relativePath: dist.pages
      }))
      .pipe(gulp.dest(dist.pages))
      .pipe(browserSync.stream({
        once: true
      }));
  });

  gulp.task('default', function () {
    runSequence(['clean'], ['nunjucks-pages', 'scss', 'images', 'images-png', 'images-gif'], ['html:buildIndex'], ['browser-sync'],
      function () {
        gulp.watch([src.pages, src.templates, src.data], ['nunjucks-templates', 'html:buildIndex']);
        gulp.watch(dist.pages + '*.html', htmlInjector);
        gulp.watch(src.scss, ['scss']);
        gulp.watch(src.img, ['images']);
        gulp.watch(src.imgPng, ['images-png']);
        gulp.watch(src.imgGif, ['images-gif']);
      });
  });

  // *************************** //
  // ** Build for prod tasks *** //
  // *************************** //

  // Delete production folder
  gulp.task('delete-prod', function () {
    del([dist.pages + '/production', dist.pages + '/temp']);
  });

  // Copy HTML (ignoring production folder)
  gulp.task('copy-files', function () {
    return gulp.src([dist.pages + '/**/*', '!' + dist.pages + '/production/**/*'])
      .pipe(gulp.dest(dist.pages + '/temp'));
  });

  // Add Media Queries to seperate stylesheet
  gulp.task('mq', function () {
    return gulp.src(dist.pages + '/**/*.css')
      .pipe(extractmediaqueries())
      .pipe(gulp.dest(dist.pages + '/temp'));
  });

  // Inject media query styles to head of document
  gulp.task('inject', function () {
    return gulp.src(dist.pages + '/temp/**/*.html')
      .pipe(styleInject({
        encapsulated: false
      }))
      .pipe(gulp.dest(dist.pages + '/temp'));
  });

  // Copy distributed images folder
  gulp.task('copy-images', function () {
    return gulp.src(dist.pages + '/temp/**/*.+(jpg|gif|png)')
      .pipe(gulp.dest(dist.pages + '/production'));
  });

  // See https://www.npmjs.com/package/gulp-inline-css for option information
  gulp.task('inline', function () {
    return gulp.src(dist.pages + '/temp/**/*.html')
      .pipe(inlineCss({
        applyStyleTags: false,
        removeStyleTags: false,
        removeLinkTags: true,
        preserveMediaQueries: true,
        applyWidthAttributes: true,
        applyTableAttributes: false
      }))
      .pipe(htmlbeautify({
        indentSize: 2,
        indent_with_tabs: true,
        preserve_newlines: false
      }))
      .pipe(rename({
        suffix: '-prod'
      }))
      .pipe(gulp.dest(dist.pages + '/production'));
  });

  // Files and folders to clean
  gulp.task('delete-temp', ['inline'], function () {
    del(dist.pages + '/temp');
    return gulp.src('./')
      .pipe(notify({
        message: 'Production template(s) ready',
        onLast: true
      }));
  });

  gulp.task('prod', function () {
    runSequence('delete-prod', 'copy-files', 'mq', 'inject', 'copy-images', 'inline', ['html:buildIndex'], ['delete-temp']);
  });

  // ********************** //
  // ** Secondary Tasks *** //
  // ********************** //

  // Files and folders to clean
  gulp.task('clean', function () {
    del([dist.pages + '/*.html', dist.css + '/*.css', dist.img, config.maps, config.reports, dist.pages + '/temp', dist.pages + '/production']);
    return gulp.src('./')
      .pipe(notify({
        message: 'Folders cleaned successfully',
        onLast: true
      }));
  });

  // Mailgun - Don't use this as it is, configure accordingly
  // Ste emails - steven.watts@homeagency.co.uk, stevenjameswatts@hotmail.com, stevewattsemail@gmail.com, stevewattsemail@yahoo.co.uk, stevewattsemail@aol.com
  gulp.task('sendmail', function () {
    gulp.src('dist/production/principal-leisure-prod.html')
      .pipe(sendmail({
        key: 'key-226d059b2db2d278d14923d728f03730',
        sender: 'ha@li1.home-trial.com',
        recipient: 'luke.fryer@homeagency.co.uk, jongo1@gmail.com',
        subject: 'HA Test'
      }));
  });

  // $ scss-lint - SCSS Linter
  gulp.task('scss-lint', function () {
    return gulp.src(config.lint)
      .pipe(scsslint({
        'reporterOutputFormat': 'Checkstyle',
        'filePipeOutput': 'scssReport.xml',
        'config': 'scss-lint.yml'
      }))
      .pipe(gulp.dest(config.reports));
  });

  // $ ftp - Uploads images to our
  gulp.task('ftp', function () {
    var conn = ftp.create({
      host: '162.13.179.48',
      user: 'u59MAFldZyIU',
      password: 'iVITiK8lcuSc6_7CGuv5',
      parallel: 10,
      log: gutil.log
    });
    var globs = [
      dist.img + '/*.{png,jpg,gif}'
    ];
    // using base = '.' will transfer everything to /public_html correctly
    // turn off buffering in gulp.src for best performance
    return gulp.src(globs, {
      base: '.',
      buffer: false
    })
      .pipe(conn.newer('/public/2017/client/project')) // only upload newer files
      .pipe(conn.dest('/public/2017/client/project'));
  });

}());