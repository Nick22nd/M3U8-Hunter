<template>
    <div>
        <el-table ref="multipleTableRef" :data="tasks" style="width: 100%" max-height="100vh"
            @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />
            <el-table-column property="durationStr" label="Date" width="100" />
            <el-table-column property="status" label="Status" width="100">
                <template #default="scope">
                    <el-tag v-if="scope.row.status === 'downloading'" type="info">{{ scope.row.status }}</el-tag>
                    <el-tag v-else-if="scope.row.status === 'downloaded'" type="success">{{ scope.row.status }}</el-tag>
                    <el-tag v-else-if="scope.row.status === 'failed'" type="danger">{{ scope.row.status }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column property="url" label="Name" width="600" />
            <el-table-column fixed="right" label="Operations" width="120">
                <template #default="scope">
                    <el-button link type="primary" size="small" @click="startTask(scope.$index)">start</el-button>
                    <el-button link type="primary" size="small" @click="deleteItem(scope.$index)">delete</el-button>
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
import { Task, Message4Renderer, MessageName } from '../../common/common.types';
const { sendMsg: sendMsgToMainProcess } = window.electron
interface propsTask {
    tasks: Task[]
}
const props = defineProps<propsTask>()
const multipleSelection = ref<Task[]>([])
const handleSelectionChange = (val: Task[]) => {
    multipleSelection.value = val
    console.log('multipleSelection', val)
}

const deleteItem = (num: number) => {
    console.log('handleClick', multipleSelection.value)
    console.log('handleClick', num)
    const newMessage: Message4Renderer = {
        name: MessageName.deleteTask,
        data: num,
        type: 'deteteTask'
    }
    sendMsgToMainProcess(newMessage)
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

</script>

<style scoped></style>