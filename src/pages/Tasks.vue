<template>
    <div class="h-full">
        <el-table ref="multipleTableRef" :data="tasks" style="width: 100%" max-height="95vh"
            @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />
            <el-table-column property="name" label="Name" width="200" />

            <el-table-column label="Progress" width="100">
                <template #default="scope">
                    <div class="flex flex-col justify-center">
                        <el-text class="mx-1">{{ scope.row.durationStr }}</el-text>
                        <el-text class="mx-1">{{ scope.row.progress }}</el-text>
                    </div>
                </template>
            </el-table-column>
            <el-table-column property="status" label="Status" width="100">
                <template #default="scope">
                    <el-tag v-if="scope.row.status === 'downloading'" type="info">{{ scope.row.status }}</el-tag>
                    <el-tag v-else-if="scope.row.status === 'downloaded'" type="success">{{ scope.row.status }}</el-tag>
                    <el-tag v-else-if="scope.row.status === 'failed'" type="danger">{{ scope.row.status }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column property="title" label="Title" width="600" />
            <el-table-column fixed="right" label="Operations" width="200">

                <template #default="scope">
                    <el-button link type="primary" size="small" @click="startTask(scope.$index)">start</el-button>
                    <el-button link type="primary" size="small" @click="deleteItem(scope.$index)">delete</el-button>
                    <el-button link type="primary" size="small" @click="openDir(scope.$index)">open dir</el-button>
                    <el-button link type="primary" size="small" @click="playTask(scope.$index)">play</el-button>
                </template>
            </el-table-column>
        </el-table>
        <div style="margin-top: 20px">
            <!-- <el-button @click="toggleSelection([tableData[1], tableData[2]])">Toggle selection status of second and third
                rows</el-button>
            <el-button @click="toggleSelection()">Clear selection</el-button> -->
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { TaskItem, Message4Renderer, MessageName } from '../common.types';
import { useTaskStore } from '../stores';
import { ElMessageBox } from 'element-plus';
const { sendMsg: sendMsgToMainProcess } = window.electron
interface propsTask {
    tasks: TaskItem[],
}
const taskStore = useTaskStore()
const props = defineProps<propsTask>()
const multipleSelection = ref<TaskItem[]>([])
const handleSelectionChange = (val: TaskItem[]) => {
    multipleSelection.value = val
    console.log('multipleSelection', val)
}

const deleteItem = (num: number) => {
    console.log('handleClick', multipleSelection.value)
    console.log('handleClick', num)
    ElMessageBox.confirm(
        'Are you sure to delete this task and files?',
        'Warning',
        {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning',
        })
        .then(() => {
            const newMessage: Message4Renderer = {
                name: MessageName.deleteTask,
                data: num,
                type: 'deteteTask'
            }
            sendMsgToMainProcess(newMessage)
        })
        .catch(() => {
            console.log('cancel the ELMessageBox')
            // catch error
        })
}
const startTask = (num: number) => {
    console.log('handleClick', num, toRaw(props.tasks[num]))
    const newMessage: Message4Renderer = {
        name: MessageName.startTask,
        data: toRaw(props.tasks[num]),
        type: 'download'
    }
    sendMsgToMainProcess(newMessage)
}
const openDir = (num: number) => {
    console.log('handleClick', num, toRaw(props.tasks[num]))
    const newMessage: Message4Renderer = {
        name: MessageName.openDir,
        data: toRaw(props.tasks[num]).directory,
        type: 'openDir'
    }
    sendMsgToMainProcess(newMessage)
}
const playTask = (num: number) => {
    console.log('handleClick', num, toRaw(props.tasks[num]))
    const task = toRaw(props.tasks[num])
    const fileName = new URL(task.url).pathname.split('/').pop()
    taskStore.playUrl = 'http://localhost:3000/' + task.directory?.split('/').pop() + '/' + fileName
    taskStore.playerTitle = task.title || 'player'
    taskStore.switchTab('Home')
}

</script>

<style scoped></style>