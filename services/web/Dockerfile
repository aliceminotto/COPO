FROM python:3.7

ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y \
    default-jre \
    rsync \
    git \
	nano \
    libxml2-dev \
    python \
    build-essential \
    make \
    gcc \
    python3-dev \
    locales \
    python3-pip \
    ruby-dev \
    rubygems \
    poppler-utils

RUN gem install sass
RUN pip install --upgrade pip

COPY ./requirements/ /tmp/requirements/
RUN pip install -r /tmp/requirements/dev.txt

RUN mkdir /copo
RUN mkdir /code

WORKDIR /copo
COPY . /code/

# add aspera client to path
COPY ./tools/reposit/.aspera/ /root/.aspera/
ENV PATH /root/.aspera/cli/bin:$PATH

ENTRYPOINT ["bash","-c","rsync -avhW --no-compress --progress /code/ /copo/ && rm -rf /code/ && python manage.py makemigrations rest && python manage.py makemigrations chunked_upload && python manage.py makemigrations && python manage.py migrate && python manage.py social_accounts && python manage.py setup_groups && python manage.py setup_schemas && /usr/local/bin/gunicorn web.wsgi:application -w 3 -t 300 -k 'gevent' -b :8000"]
