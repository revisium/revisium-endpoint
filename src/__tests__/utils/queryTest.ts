import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

const STATUS = 200;

export const graphqlQuery = async (
  url: string,
  {
    app,
    query,
    variables,
    token,
  }: {
    app: INestApplication;
    query: string;
    variables?: Record<string, any>;
    token?: string;
  },
) => {
  const res = await request(app.getHttpServer())
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send({
      query,
      variables,
    })
    .expect(STATUS);

  return (res.body as { data: any }).data;
};

export const graphqlQueryError = async (
  url: string,
  {
    app,
    query,
    variables,
    token,
    error,
  }: {
    app: INestApplication;
    query: string;
    error: RegExp;
    variables?: Record<string, any>;
    token?: string;
  },
) => {
  await request(app.getHttpServer())
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send({
      query,
      variables,
    })
    .expect(STATUS)
    .expect(error)
    .catch();
};
