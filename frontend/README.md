# Website Alerter Tool Frontend
This is the frontend of the Website Alerter tool. This creates a web application that allows the user to add/edit sites to scrape and view reports of what sites were scraped during run throughs. It interfaces with an API in AWS API Gateway and lives in a CloudFront CDN all authenticated with AWS Cognito.

## Important Files/Folders
- [app.config.ts](src/app/app.config.ts): Main Angular entry point
- [app.routes.ts](src/app/app.routes.ts): All the routing
- [app.component.ts](src/app/app.component.ts): Main display
- [services](src/app/services): Loading services used for different pages
- [styles](src/styles): All global styles used by the application

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

# Deployment
Before deployment first build and deploy the [backend](../backend) taking note of the API Gateway location "WebsiteAlerterCdnUrl" in the CDK output. Then update the `apiUrl` in the [environment.ts](src/environments/environment.ts) file.
