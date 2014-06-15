FROM ubuntu

MAINTAINER Dmitri Kolytchev <kolytchev.d@gmail.com>

RUN apt-get update
RUN apt-get -y upgrade;

RUN apt-get install -y npm

ADD package.json /var/dicemat/
ADD app.js /var/dicemat/
ADD assets /var/dicemat/

RUN cd /var.dicemat/; npm-install -d

EXPOSE 2500
CMD ['node', '/var/dicemat/app.js']