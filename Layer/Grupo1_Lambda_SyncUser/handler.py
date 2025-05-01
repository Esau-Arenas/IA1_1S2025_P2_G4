import json
import pymysql
import traceback

# Configuración de conexión
endpoint = 'grupo1-turisardb-mysql.c4r4c6im0sz5.us-east-1.rds.amazonaws.com'
username = 'admin'
password = 'turisARG1'
database_name = 'TurisAR_G1'

def lambda_handler(event, context):
    try:
        # Obtener los datos del cuerpo de la solicitud
        body = json.loads(event.get('body', '{}'))
        cognito_sub = body.get('sub')
        email = body.get('email')

        # Conectar a la base de datos MySQL
        connection = pymysql.connect(host=endpoint, user=username, password=password, db=database_name)
        cursor = connection.cursor()

        # Insertar o actualizar el usuario
        cursor.execute("""
            INSERT INTO users (cognito_sub, email)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE email = %s
        """, (cognito_sub, email, email))

        # Confirmar la transacción
        connection.commit()

        # Cerrar conexión
        cursor.close()
        connection.close()

        return {
            'statusCode': 200,
            'body': json.dumps({"message": "Usuario sincronizado exitosamente"})
        }

    except Exception as e:
        print("Error al sincronizar el usuario:", e)
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
