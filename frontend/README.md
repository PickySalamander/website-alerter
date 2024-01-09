# Website Alerter Tool Frontend
This is the frontend of the Website Alerter tool. This creates a web application that allows the user to add/edit sites to scrape and view reports of what sites were scraped during run throughs. It interfaces with a API in AWS API Gateway and lives in a CloudFront CDN. 

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.1.

## Important Files/Folders
- [app.config.ts](src/app/app.config.ts) - Main Angular entry point
- [app.routes.ts](src/app/app.routes.ts) - All the routing
- [app.component.ts](src/app/app.component.ts) - Main display
- [services](src/app/services) - Loading services used for different pages
- [styles](src/styles) - All global styles used by the application, including the Angular Material custom theme

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

# Deployment
Before deployment first build and deploy the [backend](../backend) taking note of the API Gateway location "WebsiteAlerterCdnUrl" in the CDK output. Then update the `apiUrl` in the [environment.ts](src/environments/environment.ts) file.

`npm run release` to deploy artifacts to S3 and invalidate the caches in CloudFront.
