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
        key = body.get('key')
        lugar_id = body.get('lugar_id')
        path = body.get('path')
        size_x = body.get('size_x')
        size_y = body.get('size_y')
        pos_x = body.get('pos_x')
        pos_y = body.get('pos_y')
        pos_z = body.get('pos_z')
        display_name = body.get('display_name')

        # Conectar a la base de datos MySQL
        connection = pymysql.connect(host=endpoint, user=username, password=password, db=database_name)
        cursor = connection.cursor()

        # Ejecutar la consulta para insertar un nuevo filtro
        cursor.execute("""
            INSERT INTO filtros (key, lugar_id, path, size_x, size_y, pos_x, pos_y, pos_z, display_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (key, lugar_id, path, size_x, size_y, pos_x, pos_y, pos_z, display_name))

        # Confirmar la transacción
        connection.commit()

        # Cerrar conexión
        cursor.close()
        connection.close()

        return {
            'statusCode': 201,
            'body': json.dumps({"message": "Filtro creado exitosamente"})
        }

    except Exception as e:
        print("Error al crear el filtro:", e)
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
