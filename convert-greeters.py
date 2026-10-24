"""Convert the supplied Blender models to lightweight, textured GLB parts."""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', required=True)
parser.add_argument('--output-dir', required=True)
parser.add_argument('--preview', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source_root, output = Path(args.source_dir), Path(args.output_dir)
output.mkdir(parents=True, exist_ok=True)


def components(ob):
    adjacent = {v.index: set() for v in ob.data.vertices}
    for edge in ob.data.edges:
        a, b = edge.vertices
        adjacent[a].add(b)
        adjacent[b].add(a)
    seen = set()
    for vertex in ob.data.vertices:
        if vertex.index in seen:
            continue
        pending, part = [vertex.index], []
        while pending:
            index = pending.pop()
            if index in seen:
                continue
            seen.add(index)
            part.append(index)
            pending.extend(adjacent[index] - seen)
        yield part


for name in ['steve', 'alex']:
    source = next((source_root / name / 'source').glob('*.blend'))
    texture = next((source_root / name / 'textures').glob('*.png'))
    bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=False)
    for ob in bpy.data.objects:
        if ob.type == 'ARMATURE':
            ob.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    parts = []
    for ob in list(bpy.data.objects):
        if ob.type != 'MESH':
            continue
        for indices in components(ob):
            points = [ob.matrix_world @ ob.data.vertices[i].co for i in indices]
            minimum = Vector([min(p[axis] for p in points) for axis in range(3)])
            maximum = Vector([max(p[axis] for p in points) for axis in range(3)])
            center = (minimum + maximum) / 2
            weights = {}
            for i in indices:
                for membership in ob.data.vertices[i].groups:
                    group = ob.vertex_groups[membership.group].name
                    weights[group] = weights.get(group, 0) + membership.weight
            if name == 'steve':
                label = {'Cube': 'Head', 'Cube.001': 'Body', 'Cube.003': 'RightArm', 'Cube.006': 'LeftArm', 'Cube.004': 'LeftLeg', 'Cube.005': 'RightLeg'}[ob.name]
            elif weights.get('Head', 0) > 4:
                label = 'Head'
            elif weights.get('Spine', 0) > 1:
                label = 'Body'
            elif maximum.z > 7:
                label = 'RightArm' if center.x > 0 else 'LeftArm'
            else:
                label = 'RightLeg' if center.x > 0 else 'LeftLeg'
            parts.append(dict(object=ob, indices=indices, minimum=minimum, maximum=maximum, center=center, label=label))
    assert len(parts) == 6, 'Each supplied model must retain all six original body parts'
    head = next(part for part in parts if part['label'] == 'Head')
    body = next(part for part in parts if part['label'] == 'Body')
    scale = 2 / (head['maximum'].x - head['minimum'].x)
    waist = body['minimum'].z
    center_x = body['center'].x

    def normalized(point):
        # Alex's source faces +Y; orient both original models toward -Y.
        facing = -1 if name == 'alex' else 1
        return Vector((facing * (point.x - center_x) * scale, facing * point.y * scale, (point.z - waist) * scale - .25))

    image = bpy.data.images.load(str(texture), check_existing=False)
    image.pack()
    material = bpy.data.materials.new(name.title() + '_OriginalSkin')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = 1
    shader.inputs['Metallic'].default_value = 0
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Closest'
    material.node_tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])
    root = bpy.data.objects.new(name.title(), None)
    bpy.context.collection.objects.link(root)
    exported = [root]
    for part in parts:
        ob, indices = part['object'], part['indices']
        label = part['label']
        wave_side = 'LeftArm'
        if label.endswith('Arm'):
            label = 'WaveArm' if label == wave_side else 'RestArm'
            pivot = normalized(Vector((part['center'].x, part['center'].y, part['maximum'].z - .12 / scale)))
        elif label == 'Head':
            pivot = normalized(Vector((part['center'].x, part['center'].y, part['minimum'].z)))
        else:
            pivot = Vector((0, 0, 0))
        lookup = {old: index for index, old in enumerate(indices)}
        polygons = [poly for poly in ob.data.polygons if all(i in lookup for i in poly.vertices)]
        vertices = [normalized(ob.matrix_world @ ob.data.vertices[i].co) - pivot for i in indices]
        mesh = bpy.data.meshes.new(name + '_' + label)
        mesh.from_pydata(vertices, [], [[lookup[i] for i in poly.vertices] for poly in polygons])
        mesh.update()
        assert ob.data.uv_layers.active, 'Original model must contain UV coordinates'
        uv = mesh.uv_layers.new(name='OriginalUV')
        for original, copied in zip(polygons, mesh.polygons):
            for old_loop, new_loop in zip(original.loop_indices, copied.loop_indices):
                uv.data[new_loop].uv = ob.data.uv_layers.active.data[old_loop].uv
        part_object = bpy.data.objects.new(name.title() + '_' + label, mesh)
        bpy.context.collection.objects.link(part_object)
        part_object.parent = root
        part_object.location = pivot
        mesh.materials.append(material)
        exported.append(part_object)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in exported:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(output / f'{name}.glb'), export_format='GLB', use_selection=True, export_animations=False, export_yup=True, export_cameras=False, export_lights=False)
    print('EXPORTED_ORIGINAL_MODEL', name, sum(len(ob.data.vertices) for ob in exported if ob.type == 'MESH'))

# Render the fallback from the actual exported assets, in the website's pose.
bpy.ops.wm.read_factory_settings(use_empty=True)
for index, name in enumerate(['steve', 'alex']):
    bpy.ops.import_scene.gltf(filepath=str(output / f'{name}.glb'))
    root = bpy.data.objects[name.title()]
    root.rotation_mode = 'XYZ'
    root.location.x = 1.55 if index else -1.55
    root.rotation_euler.z = -.12 if index else .12
    outer = 1 if index else -1
    wave = bpy.data.objects[name.title() + '_WaveArm']
    wave.rotation_mode = 'XYZ'
    wave.rotation_euler.y = -outer * (2.72 + math.sin(index * 1.4) * .19)
    rest = bpy.data.objects[name.title() + '_RestArm']
    rest.rotation_mode = 'XYZ'
    rest.rotation_euler.x = -.12

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = args.preview
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('Soft daylight')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.8, .85, 1, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
light_data = bpy.data.lights.new('Softbox', 'AREA')
light_data.energy = 650
light_data.size = 8
light = bpy.data.objects.new('Softbox', light_data)
bpy.context.collection.objects.link(light)
light.location = (-4, -8, 10)
light.rotation_euler = (Vector((0, 0, 2.5)) - light.location).to_track_quat('-Z', 'Y').to_euler()
camera_data = bpy.data.cameras.new('Banner camera')
camera = bpy.data.objects.new('Banner camera', camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (3, -24, 5.7)
camera.rotation_euler = (Vector((0, 0, 3.05)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 10.2
scene.camera = camera
bpy.ops.render.render(write_still=True)
