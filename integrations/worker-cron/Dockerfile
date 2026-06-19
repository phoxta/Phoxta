FROM curlimages/curl:latest
USER root
COPY ping.sh /ping.sh
RUN chmod +x /ping.sh
ENTRYPOINT ["sh", "/ping.sh"]
