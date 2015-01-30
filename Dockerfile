FROM ubuntu

MAINTAINER Dmitri Kolytchev <kolytchev.d@gmail.com>

RUN apt-get update --fix-missing;
RUN apt-get -y upgrade;

RUN apt-get install -y npm imagemagick 

ADD package.json /var/dicemat/
ADD app.js /var/dicemat/
ADD assets /var/dicemat/assets

RUN cd /var/dicemat/; npm install -d

EXPOSE 2500
ENTRYPOINT cd /var/dicemat/; nodejs app.js;
