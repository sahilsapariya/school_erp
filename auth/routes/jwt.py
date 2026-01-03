"""
IMPORTANT:

THIS IS NOT IN THE CURRENT IMPLEMENTATION OF THE AUTHENTICATION SERVICE.
IT CAN ONLY BE USED IF AUTH SYSTEM IS SEPARATED FROM THE MAIN SERVICE.
AND USED AS MICROSERVICE, DEPLOYED SEPARATELY.
"""



from flask import Blueprint, request, jsonify

bp = Blueprint('jwt', __name__)

@bp.route('/token/validate', methods=['POST'])
def validate_token():
    data = request.get_json()
    token = data.get('token')
    token_type = data.get('token_type', 'access')

    if not token:
        return jsonify({'error': 'Token is required'}), 400
    if token_type not in ['access', 'refresh']:
        return jsonify({'error': 'Invalid token type'}), 400
    

    # Here you would typically add code to validate the JWT token.
    # For this example, we'll just assume the token is valid if it matches the mock token.

    mock_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IiJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

    is_valid = token == mock_token

    return jsonify({'is_valid': is_valid}), 200