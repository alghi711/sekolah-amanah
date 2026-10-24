"""Render a static fallback from the same original models as the portal scene."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
time = 5
for name in ['steve', 'alex']:
    bpy.ops.import_scene.gltf(filepath=str(root / 'assets/models' / f'{name}.glb'))
    character = bpy.data.objects[name.title()]
    bpy.context.view_layer.update()
    minimum = min((ob.matrix_world @ Vector(corner)).z for ob in character.children_recursive if ob.type == 'MESH' for corner in ob.bound_box)
    alex = name == 'alex'
    x = -19.5 + ((20.4 if alex else 18.5) + 19.5) * ((5 - (1.5 if alex else 2.6)) / (6 if alex else 6.2))
    character.location = (x, -.65, -minimum)
    character.rotation_mode = 'XYZ'
    character.rotation_euler = (0, .06, 1.05)
    stride = math.sin(time * 11 + (1 if alex else 0))
    character.location.z += abs(stride) * .16
    for suffix, angle in [('_LeftLeg',stride*.7),('_RightLeg',-stride*.7),('_WaveArm',-stride*.65),('_RestArm',stride*.65)]:
        part = bpy.data.objects[name.title() + suffix]
        part.rotation_mode = 'XYZ'
        part.rotation_euler.x = angle


def material(name, color, emission=False):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.use_nodes = True
    shader = value.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = 1
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = .8
    return value


stone = material('Obsidian', (.055,.028,.08))
accent = material('Obsidian highlights', (.13,.07,.18))
purple = material('Portal', (.31,.065,.6), True)
spark = material('Portal particles', (.66,.32,.9), True)


def block(parent, position, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.object
    ob.parent = parent
    ob.location = position
    ob.scale = size
    ob.data.materials.append(mat)


for index, x in enumerate([-21.5,21.5]):
    portal = bpy.data.objects.new('Portal', None)
    bpy.context.collection.objects.link(portal)
    portal.location.x = x
    portal.rotation_euler.z = .22 if index == 0 else -.22
    for row in range(7):
        for edge in [-1,1]:
            block(portal,(edge*1.6,0,.7+row*1.3),(.8,.8,1.3),accent if row%3==0 else stone)
    for column in range(4):
        for z in [.3,9.4]:
            block(portal,(-1.5+column,0,z),(1,.8,.8),accent if column%2 else stone)
    block(portal,(0,-.03,4.85),(2.4,.06,8.3),purple)
    for i in range(5):
        block(portal,((1 if i%2 else -1)*(1+i*.12),-.6,.7+(i*1.7+time*.65+index)%8.3),(.13,.13,.13),spark)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.render.resolution_x = 1280
scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = str(root / 'assets/hero-chase.png')
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('Daylight')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.8,.85,1,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .7
data = bpy.data.lights.new('Softbox','AREA')
data.energy = 1300
data.size = 20
light = bpy.data.objects.new('Softbox',data)
bpy.context.collection.objects.link(light)
light.location = (-4,-12,18)
light.rotation_euler = (Vector((0,0,4))-light.location).to_track_quat('-Z','Y').to_euler()
data = bpy.data.cameras.new('Camera')
camera = bpy.data.objects.new('Camera',data)
bpy.context.collection.objects.link(camera)
camera.location = (0,-30,5.8)
camera.rotation_euler = (Vector((0,0,5.8))-camera.location).to_track_quat('-Z','Y').to_euler()
data.type = 'ORTHO'
data.ortho_scale = 48
scene.camera = camera
bpy.ops.render.render(write_still=True)
