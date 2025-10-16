# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime
import sqlite3
import json
import os

app = Flask(__name__)

# Configuration
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-this-in-production'  # Change this!
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Enable CORS for frontend communication
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize JWT
jwt = JWTManager(app)

# Database configuration
DATABASE = 'zenith.db'

# ================================
# DATABASE HELPER FUNCTIONS
# ================================

def get_db():
    """Create database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def init_db():
    """Initialize database with tables"""
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()
        print('✓ Database initialized successfully')

# ================================
# AUTHENTICATION ENDPOINTS
# ================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate input
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Hash password
        password_hash = generate_password_hash(password)
        
        # Insert into database
        db = get_db()
        try:
            cursor = db.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                (username, email, password_hash)
            )
            db.commit()
            user_id = cursor.lastrowid
            
            # Create tokens
            access_token = create_access_token(identity=user_id)
            refresh_token = create_refresh_token(identity=user_id)
            
            return jsonify({
                'message': 'User registered successfully',
                'user': {
                    'id': user_id,
                    'username': username,
                    'email': email
                },
                'access_token': access_token,
                'refresh_token': refresh_token
            }), 201
            
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Username or email already exists'}), 409
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user and return JWT tokens"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        db = get_db()
        user = db.execute(
            'SELECT * FROM users WHERE username = ?',
            (username,)
        ).fetchone()
        db.close()
        
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create tokens
        access_token = create_access_token(identity=user['id'])
        refresh_token = create_refresh_token(identity=user['id'])
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    try:
        user_id = get_jwt_identity()
        db = get_db()
        user = db.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        db.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'created_at': user['created_at']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ================================
# TASK CRUD ENDPOINTS
# ================================

@app.route('/api/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    """Get all tasks for current user"""
    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        tasks = db.execute(
            '''SELECT id, title, description, status, priority, due_date,
                      tags, subtasks, created_at, updated_at
               FROM tasks WHERE user_id = ?
               ORDER BY created_at DESC''',
            (user_id,)
        ).fetchall()
        db.close()
        
        # Convert to list of dictionaries
        tasks_list = []
        for task in tasks:
            task_dict = dict(task)
            # Parse JSON fields
            task_dict['tags'] = json.loads(task_dict['tags']) if task_dict['tags'] else []
            task_dict['subtasks'] = json.loads(task_dict['subtasks']) if task_dict['subtasks'] else []
            tasks_list.append(task_dict)
        
        return jsonify({'tasks': tasks_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks', methods=['POST'])
@jwt_required()
def create_task():
    """Create a new task"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        title = data.get('title', '').strip()
        if not title:
            return jsonify({'error': 'Title is required'}), 400
        
        # Extract task data
        description = data.get('description', '').strip() or None
        status = data.get('status', 'todo')
        priority = data.get('priority', 'medium')
        due_date = data.get('dueDate')
        tags = json.dumps(data.get('tags', []))
        subtasks = json.dumps(data.get('subtasks', []))
        
        db = get_db()
        cursor = db.execute(
            '''INSERT INTO tasks (user_id, title, description, status, priority,
                                due_date, tags, subtasks)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (user_id, title, description, status, priority, due_date, tags, subtasks)
        )
        db.commit()
        task_id = cursor.lastrowid
        
        # Fetch the created task
        task = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        db.close()
        
        task_dict = dict(task)
        task_dict['tags'] = json.loads(task_dict['tags']) if task_dict['tags'] else []
        task_dict['subtasks'] = json.loads(task_dict['subtasks']) if task_dict['subtasks'] else []
        
        return jsonify({
            'message': 'Task created successfully',
            'task': task_dict
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Update an existing task"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        db = get_db()
        
        # Verify task belongs to user
        task = db.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            (task_id, user_id)
        ).fetchone()
        
        if not task:
            db.close()
            return jsonify({'error': 'Task not found'}), 404
        
        # Update task
        title = data.get('title', task['title'])
        description = data.get('description', task['description'])
        status = data.get('status', task['status'])
        priority = data.get('priority', task['priority'])
        due_date = data.get('dueDate', task['due_date'])
        tags = json.dumps(data.get('tags', json.loads(task['tags'] or '[]')))
        subtasks = json.dumps(data.get('subtasks', json.loads(task['subtasks'] or '[]')))
        
        db.execute(
            '''UPDATE tasks
               SET title = ?, description = ?, status = ?, priority = ?,
                   due_date = ?, tags = ?, subtasks = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND user_id = ?''',
            (title, description, status, priority, due_date, tags, subtasks, task_id, user_id)
        )
        db.commit()
        
        # Fetch updated task
        updated_task = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        db.close()
        
        task_dict = dict(updated_task)
        task_dict['tags'] = json.loads(task_dict['tags']) if task_dict['tags'] else []
        task_dict['subtasks'] = json.loads(task_dict['subtasks']) if task_dict['subtasks'] else []
        
        return jsonify({
            'message': 'Task updated successfully',
            'task': task_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    """Delete a task"""
    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        # Verify task belongs to user
        task = db.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            (task_id, user_id)
        ).fetchone()
        
        if not task:
            db.close()
            return jsonify({'error': 'Task not found'}), 404
        
        db.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
        db.commit()
        db.close()
        
        return jsonify({'message': 'Task deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ================================
# ERROR HANDLERS
# ================================

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Invalid token'}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'error': 'Authorization token required'}), 401

# ================================
# MAIN
# ================================

if __name__ == '__main__':
    # Initialize database if it doesn't exist
    if not os.path.exists(DATABASE):
        init_db()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
