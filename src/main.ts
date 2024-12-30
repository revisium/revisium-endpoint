import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from 'src/app.module';
import { DEFAULT_PORT } from 'src/endpoint-microservice/shared/default-port';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  const portPath = 'ENDPOINT_PORT';
  const hostPath = 'ENDPOINT_HOST';

  const endpointPort = parseInt(config.get<string>(portPath));
  const endpointHost = config.get<string>(hostPath);

  if (!endpointPort) {
    throw new Error(`Environment variable not found: ${portPath}`);
  }

  if (!endpointHost) {
    throw new Error(`Environment variable not found: ${hostPath}`);
  }

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      port: endpointPort,
      host: endpointHost,
    },
  });

  await app.startAllMicroservices();

  const port = config.get('PORT') || DEFAULT_PORT;

  await app.listen(port);
}

bootstrap();
