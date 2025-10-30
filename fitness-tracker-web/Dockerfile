#build stage
FROM node:22 AS build
WORKDIR /web
COPY package*.json ./
RUN npm ci
COPY . .
#APP=Angular project name from angular.json -> "projects.{APP}"
ARG APP=fitness-tracker-app
RUN npx ng build $APP --configuration production

#runtime stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
#try Angular17+/builder(path with /browser); if your dist has no /browser, change to next line
COPY --from=build /web/dist/fitness-tracker-app/browser/ /usr/share/nginx/html/
#COPY --from=build /web/dist/fitness-tracker-app/ /usr/share/nginx/html/
EXPOSE 80
ENTRYPOINT ["nginx","-g","daemon off;"]
